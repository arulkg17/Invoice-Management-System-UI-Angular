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

import { ReceiptService } from '../../../services/receipt.service';
import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { LookupService } from '../../../services/lookup.service';
import { Receipt, ReceiptFilter } from '../../../models/receipt';
import { PurchaseOrder } from '../../../models/purchase-order';
import { Vendor } from '../../../models/vendor';
import { DOC_STATUSES } from '../../../models/document-status';
import { getApiMessage } from '../../../shared/api-helpers';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PdfViewerService } from '../../../shared/pdf-viewer.service';

@Component({
  selector: 'app-receipt-list',
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
  templateUrl: './receipt-list.component.html',
  styleUrl: './receipt-list.component.css',
})
export class ReceiptListComponent implements OnInit {
  private readonly service = inject(ReceiptService);
  private readonly poService = inject(PurchaseOrderService);
  private readonly lookup = inject(LookupService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pdfViewer = inject(PdfViewerService);

  readonly displayedColumns = [
    'receiptNumber',
    'receiptDate',
    'purchaseOrder',
    'vendor',
    'status',
    'subTotal',
    'taxAmount',
    'totalAmount',
    'actions',
  ];

  readonly statuses = DOC_STATUSES;

  readonly receipts = signal<Receipt[]>([]);
  readonly vendors = signal<Vendor[]>([]);
  readonly purchaseOrders = signal<PurchaseOrder[]>([]);
  readonly isLoading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  private readonly vendorNames = computed(
    () => new Map(this.vendors().map((v) => [v.id, v.vendorName])),
  );

  private readonly poNumbers = computed(
    () => new Map(this.purchaseOrders().map((p) => [p.id, p.poNumber])),
  );

  readonly filterForm = this.fb.group({
    receiptNumber: [''],
    purchaseOrderId: [null as number | null],
    vendorId: [null as number | null],
    status: [''],
  });

  constructor() {
    this.filterForm.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex.set(0);
        void this.load();
      });
  }

  async ngOnInit(): Promise<void> {
    await this.loadLookups();
    await this.load();
  }

  private async loadLookups(): Promise<void> {
    try {
      const [vendors, orders] = await Promise.all([
        firstValueFrom(this.lookup.getVendors()),
        firstValueFrom(this.poService.getAll()),
      ]);

      this.vendors.set(vendors.data ?? []);
      this.purchaseOrders.set(orders.data ?? []);
    } catch (error) {
      this.notify(
        getApiMessage(error, 'Unable to load vendors / purchase orders'),
      );
    }
  }

  async load(): Promise<void> {
    this.isLoading.set(true);

    try {
      const value = this.filterForm.getRawValue();

      const filter: ReceiptFilter = {
        receiptNumber: value.receiptNumber ?? '',
        purchaseOrderId: value.purchaseOrderId,
        vendorId: value.vendorId,
        status: value.status,
        pageNumber: this.pageIndex() + 1,
        pageSize: this.pageSize(),
      };

      const response = await firstValueFrom(this.service.getPaged(filter));

      if (!response.success) {
        this.notify(response.message || 'Unable to load receipts');
        return;
      }

      this.receipts.set(response.data?.data ?? []);
      this.totalRecords.set(response.data?.totalRecords ?? 0);
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load receipts'));
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilters(): void {
    this.filterForm.reset({
      receiptNumber: '',
      purchaseOrderId: null,
      vendorId: null,
      status: '',
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    void this.load();
  }

  // ---------------- DISPLAY HELPERS ----------------
  vendorName(id: number): string {
    return this.vendorNames().get(id) ?? `#${id}`;
  }

  poNumber(id: number): string {
    return this.poNumbers().get(id) ?? `#${id}`;
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  canEdit(r: Receipt): boolean {
    return r.status === 'Draft';
  }

  canPost(r: Receipt): boolean {
    return r.status === 'Draft';
  }

  canCancel(r: Receipt): boolean {
    return r.status === 'Draft' || r.status === 'Posted';
  }

  canDelete(r: Receipt): boolean {
    return r.status === 'Draft';
  }

  // ---------------- NAVIGATION ----------------
  add(): void {
    void this.router.navigate(['/transactions/receipt/create']);
  }

  open(r: Receipt): void {
    void this.router.navigate(['/transactions/receipt/edit', r.id]);
  }

  // ---------------- ACTIONS ----------------
  post(r: Receipt): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Post Receipt',
        message: `Post ${r.receiptNumber}? The goods are added to stock and the purchase order is updated. A posted receipt can no longer be edited.`,
        confirmText: 'Post',
        confirmColor: 'primary',
      },
      () => firstValueFrom(this.service.post(r.id)),
      `${r.receiptNumber} posted`,
    );
  }

  cancel(r: Receipt): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Cancel Receipt',
        message: `Cancel ${r.receiptNumber}? ${
          r.status === 'Posted' ? 'The stock it added is taken back.' : ''
        }`,
        confirmText: 'Cancel Receipt',
        confirmColor: 'warn',
      },
      () => firstValueFrom(this.service.cancel(r.id)),
      `${r.receiptNumber} cancelled`,
    );
  }

  remove(r: Receipt): Promise<void> {
    return this.confirmAndRun(
      { name: r.receiptNumber },
      () => firstValueFrom(this.service.delete(r.id)),
      `${r.receiptNumber} deleted`,
    );
  }

  private async confirmAndRun(
    data: ConfirmDialogData,
    action: () => Promise<{ success: boolean; message: string }>,
    successMessage: string,
  ): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, { width: '420px', data })
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
      // e.g. "Cannot cancel: stock of item A01 has already been sold ..."
      this.notify(getApiMessage(error, 'The operation failed'));
    }
  }
  // ---------------- PDF ----------------
  viewPdf(r: Receipt): void {
    this.pdfViewer
      .preview('Receipt', r.id, `Goods Receipt ${r.receiptNumber}`)
      .subscribe();
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 5000 });
  }
}
