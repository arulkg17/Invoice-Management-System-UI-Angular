import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { LookupService } from '../../../services/lookup.service';
import {
  PO_STATUSES,
  PurchaseOrder,
  PurchaseOrderFilter,
} from '../../../models/purchase-order';
import { Vendor } from '../../../models/vendor';
import { getApiMessage } from '../../../shared/api-helpers';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-po-list',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatDialogModule,
  ],
  templateUrl: './po-list.component.html',
  styleUrl: './po-list.component.css',
})
export class PoListComponent implements OnInit {
  private readonly service = inject(PurchaseOrderService);
  private readonly lookup = inject(LookupService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'poNumber',
    'poDate',
    'vendor',
    'status',
    'subTotal',
    'taxAmount',
    'totalAmount',
    'actions',
  ];

  readonly statuses = PO_STATUSES;

  // ---- screen state (signals, so the view updates with or without zone.js) ----
  readonly orders = signal<PurchaseOrder[]>([]);
  readonly vendors = signal<Vendor[]>([]);
  readonly isLoading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  private readonly vendorNames = computed(
    () => new Map(this.vendors().map((v) => [v.id, v.vendorName])),
  );

  // ---- search form ----
  readonly filterForm = this.fb.group({
    poNumber: [''],
    vendorId: [null as number | null],
    status: [''],
  });

  constructor() {
    // Search as the user types / selects (debounced)
    this.filterForm.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex.set(0);
        void this.load();
      });
  }

  async ngOnInit(): Promise<void> {
    await this.loadVendors();
    await this.load();
  }

  // ---------------- DATA ----------------
  private async loadVendors(): Promise<void> {
    try {
      const response = await firstValueFrom(this.lookup.getVendors());
      this.vendors.set(response.data ?? []);
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load vendors'));
    }
  }

  async load(): Promise<void> {
    this.isLoading.set(true);

    try {
      const value = this.filterForm.getRawValue();

      const filter: PurchaseOrderFilter = {
        poNumber: value.poNumber ?? '',
        vendorId: value.vendorId,
        status: value.status,
        pageNumber: this.pageIndex() + 1,
        pageSize: this.pageSize(),
      };

      const response = await firstValueFrom(this.service.getPaged(filter));

      if (!response.success) {
        this.notify(response.message || 'Unable to load purchase orders');
        return;
      }

      this.orders.set(response.data?.data ?? []);
      this.totalRecords.set(response.data?.totalRecords ?? 0);
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load purchase orders'));
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilters(): void {
    this.filterForm.reset({ poNumber: '', vendorId: null, status: '' });
    // reset() raises valueChanges, which reloads the list after the debounce
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    void this.load();
  }

  // ---------------- DISPLAY HELPERS ----------------
  vendorName(vendorId: number): string {
    return this.vendorNames().get(vendorId) ?? `#${vendorId}`;
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  canEdit(po: PurchaseOrder): boolean {
    return po.status === 'Draft';
  }

  canApprove(po: PurchaseOrder): boolean {
    return po.status === 'Draft';
  }

  canCancel(po: PurchaseOrder): boolean {
    return po.status === 'Draft' || po.status === 'Approved';
  }

  canDelete(po: PurchaseOrder): boolean {
    return po.status === 'Draft' || po.status === 'Cancelled';
  }

  // ---------------- NAVIGATION ----------------
  add(): void {
    void this.router.navigate(['/transactions/po/create']);
  }

  /** Draft = edit, anything else opens read-only. */
  open(po: PurchaseOrder): void {
    void this.router.navigate(['/transactions/po/edit', po.id]);
  }

  // ---------------- ACTIONS ----------------
  approve(po: PurchaseOrder): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Approve Purchase Order',
        message: `Approve ${po.poNumber}? It can no longer be edited after approval.`,
        confirmText: 'Approve',
        confirmColor: 'primary',
      },
      () => firstValueFrom(this.service.approve(po.id)),
      `${po.poNumber} approved`,
    );
  }

  cancel(po: PurchaseOrder): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Cancel Purchase Order',
        message: `Cancel ${po.poNumber}? This cannot be undone.`,
        confirmText: 'Cancel PO',
        confirmColor: 'warn',
      },
      () => firstValueFrom(this.service.cancel(po.id)),
      `${po.poNumber} cancelled`,
    );
  }

  remove(po: PurchaseOrder): Promise<void> {
    return this.confirmAndRun(
      { name: po.poNumber },
      () => firstValueFrom(this.service.delete(po.id)),
      `${po.poNumber} deleted`,
    );
  }

  private async confirmAndRun(
    data: ConfirmDialogData,
    action: () => Promise<{ success: boolean; message: string }>,
    successMessage: string,
  ): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, { width: '380px', data })
        .afterClosed(),
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await action();

      this.notify(response.success ? successMessage : response.message);

      await this.load();
    } catch (error) {
      // Business-rule errors from the API (HTTP 400) are shown as sent
      this.notify(getApiMessage(error, 'The operation failed'));
    }
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000 });
  }
}
