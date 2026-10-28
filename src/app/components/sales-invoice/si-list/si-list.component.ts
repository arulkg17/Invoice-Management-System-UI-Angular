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

import { SalesInvoiceService } from '../../../services/sales-invoice.service';
import { LookupService } from '../../../services/lookup.service';
import {
  SalesInvoice,
  SalesInvoiceFilter,
} from '../../../models/sales-invoice';
import { Customer } from '../../../models/customer';
import { DOC_STATUSES } from '../../../models/document-status';
import { getApiMessage } from '../../../shared/api-helpers';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PdfViewerService } from '../../../shared/pdf-viewer.service';

@Component({
  selector: 'app-si-list',
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
  templateUrl: './si-list.component.html',
  styleUrl: './si-list.component.css',
})
export class SiListComponent implements OnInit {
  private readonly service = inject(SalesInvoiceService);
  private readonly lookup = inject(LookupService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pdfViewer = inject(PdfViewerService);

  readonly displayedColumns = [
    'invoiceNumber',
    'invoiceDate',
    'dueDate',
    'customer',
    'status',
    'subTotal',
    'taxAmount',
    'totalAmount',
    'actions',
  ];

  readonly statuses = DOC_STATUSES;

  readonly invoices = signal<SalesInvoice[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly isLoading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  private readonly customerNames = computed(
    () => new Map(this.customers().map((c) => [c.id, c.customerName])),
  );

  readonly filterForm = this.fb.group({
    invoiceNumber: [''],
    customerId: [null as number | null],
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
    await this.loadCustomers();
    await this.load();
  }

  private async loadCustomers(): Promise<void> {
    try {
      const response = await firstValueFrom(this.lookup.getCustomers());
      this.customers.set(response.data ?? []);
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load customers'));
    }
  }

  async load(): Promise<void> {
    this.isLoading.set(true);

    try {
      const value = this.filterForm.getRawValue();

      const filter: SalesInvoiceFilter = {
        invoiceNumber: value.invoiceNumber ?? '',
        customerId: value.customerId,
        status: value.status,
        pageNumber: this.pageIndex() + 1,
        pageSize: this.pageSize(),
      };

      const response = await firstValueFrom(this.service.getPaged(filter));

      if (!response.success) {
        this.notify(response.message || 'Unable to load sales invoices');
        return;
      }

      this.invoices.set(response.data?.data ?? []);
      this.totalRecords.set(response.data?.totalRecords ?? 0);
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load sales invoices'));
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilters(): void {
    this.filterForm.reset({ invoiceNumber: '', customerId: null, status: '' });
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    void this.load();
  }

  // ---------------- DISPLAY HELPERS ----------------
  customerName(id: number): string {
    return this.customerNames().get(id) ?? `#${id}`;
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  canEdit(i: SalesInvoice): boolean {
    return i.status === 'Draft';
  }

  canPost(i: SalesInvoice): boolean {
    return i.status === 'Draft';
  }

  canCancel(i: SalesInvoice): boolean {
    return i.status === 'Draft' || i.status === 'Posted';
  }

  canDelete(i: SalesInvoice): boolean {
    return i.status === 'Draft';
  }

  // ---------------- NAVIGATION ----------------
  add(): void {
    void this.router.navigate(['/transactions/sales-invoice/create']);
  }

  open(i: SalesInvoice): void {
    void this.router.navigate(['/transactions/sales-invoice/edit', i.id]);
  }

  // ---------------- ACTIONS ----------------
  post(i: SalesInvoice): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Post Sales Invoice',
        message: `Post ${i.invoiceNumber}? The stock is checked and reduced. A posted invoice can no longer be edited.`,
        confirmText: 'Post',
        confirmColor: 'primary',
      },
      () => firstValueFrom(this.service.post(i.id)),
      `${i.invoiceNumber} posted`,
    );
  }

  cancel(i: SalesInvoice): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Cancel Sales Invoice',
        message: `Cancel ${i.invoiceNumber}? ${
          i.status === 'Posted' ? 'The stock is given back.' : ''
        }`,
        confirmText: 'Cancel Invoice',
        confirmColor: 'warn',
      },
      () => firstValueFrom(this.service.cancel(i.id)),
      `${i.invoiceNumber} cancelled`,
    );
  }

  remove(i: SalesInvoice): Promise<void> {
    return this.confirmAndRun(
      { name: i.invoiceNumber },
      () => firstValueFrom(this.service.delete(i.id)),
      `${i.invoiceNumber} deleted`,
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
      // e.g. "Insufficient stock for item A01 (available 2, required 5)."
      this.notify(getApiMessage(error, 'The operation failed'));
    }
  }
  // ---------------- PDF ----------------
  viewPdf(i: SalesInvoice): void {
    this.pdfViewer
      .preview('SalesInvoice', i.id, `Sales Invoice ${i.invoiceNumber}`)
      .subscribe();
  }
  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 5000 });
  }
}
