import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { SalesInvoiceService } from '../../../services/sales-invoice.service';
import { StockService } from '../../../services/stock.service';
import { LookupService } from '../../../services/lookup.service';
import {
  SalesInvoice,
  SalesInvoiceDetail,
  SalesInvoiceRequest,
} from '../../../models/sales-invoice';
import { Customer } from '../../../models/customer';
import { Itemmaster } from '../../../models/itemmaster';
import { getApiMessage, toApiDate } from '../../../shared/api-helpers';
import { calcLine, round2 } from '../../../shared/money';
import { SelectOnFocusDirective } from '../../../custom-directives/select-on-focus.directive';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog.component';

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/** A line's discount cannot be more than quantity x rate. */
function discountNotAboveAmount(group: AbstractControl): ValidationErrors | null {
  const quantity = Number(group.get('quantity')?.value ?? 0);
  const rate = Number(group.get('rate')?.value ?? 0);
  const discount = Number(group.get('discountAmount')?.value ?? 0);

  return discount > round2(quantity * rate) ? { discountTooHigh: true } : null;
}

/** The due date (when given) cannot be before the invoice date. */
function dueNotBeforeInvoice(form: AbstractControl): ValidationErrors | null {
  const invoiceDate = form.get('invoiceDate')?.value as Date | null;
  const dueDate = form.get('dueDate')?.value as Date | null;

  if (!invoiceDate || !dueDate) {
    return null;
  }

  const start = new Date(invoiceDate).setHours(0, 0, 0, 0);
  const end = new Date(dueDate).setHours(0, 0, 0, 0);

  return end < start ? { dueBeforeInvoice: true } : null;
}

function atLeastOneLine(control: AbstractControl): ValidationErrors | null {
  const lines = control as unknown as { length: number };

  return lines.length > 0 ? null : { noLines: true };
}

function createLine(
  fb: NonNullableFormBuilder,
  line?: Partial<SalesInvoiceDetail>,
) {
  return fb.group(
    {
      itemmasterId: fb.control<number | null>(
        line?.itemmasterId ?? null,
        Validators.required,
      ),
      quantity: fb.control(line?.quantity ?? 1, [
        Validators.required,
        Validators.min(0.01),
      ]),
      rate: fb.control(line?.rate ?? 0, [
        Validators.required,
        Validators.min(0),
      ]),
      discountAmount: fb.control(line?.discountAmount ?? 0, [
        Validators.required,
        Validators.min(0),
      ]),
      taxPercent: fb.control(line?.taxPercent ?? 0, [
        Validators.required,
        Validators.min(0),
        Validators.max(100),
      ]),
    },
    { validators: discountNotAboveAmount },
  );
}

type LineGroup = ReturnType<typeof createLine>;

@Component({
  selector: 'app-si-form',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressBarModule,
    MatDialogModule,
    SelectOnFocusDirective,
  ],
  templateUrl: './si-form.component.html',
  styleUrl: './si-form.component.css',
})
export class SiFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(SalesInvoiceService);
  private readonly stockService = inject(StockService);
  private readonly lookup = inject(LookupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // ---------------- FORM ----------------
  readonly form = this.fb.group(
    {
      invoiceNumber: this.fb.control('', Validators.maxLength(30)),
      invoiceDate: this.fb.control<Date | null>(new Date(), Validators.required),
      dueDate: this.fb.control<Date | null>(null),
      customerId: this.fb.control<number | null>(null, Validators.required),
      notes: this.fb.control('', Validators.maxLength(500)),
      details: this.fb.array<LineGroup>([createLine(this.fb)], atLeastOneLine),
    },
    { validators: dueNotBeforeInvoice },
  );

  get lines() {
    return this.form.controls.details;
  }

  // ---------------- SCREEN STATE ----------------
  readonly customers = signal<Customer[]>([]);
  readonly items = signal<Itemmaster[]>([]);
  /** itemId -> quantity on hand (posted receipts minus posted invoices) */
  readonly stock = signal<Map<number, number>>(new Map());

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly invoiceId = signal(0);
  readonly status = signal('Draft');

  readonly isEdit = computed(() => this.invoiceId() > 0);
  readonly isReadOnly = computed(() => this.status() !== 'Draft');
  readonly canCancelInvoice = computed(
    () => this.isEdit() && ['Draft', 'Posted'].includes(this.status()),
  );

  readonly title = computed(() => {
    if (!this.isEdit()) {
      return 'New Sales Invoice';
    }

    return this.isReadOnly() ? 'View Sales Invoice' : 'Edit Sales Invoice';
  });

  // The form is not a signal, so a counter tells the computed values to refresh
  private readonly tick = signal(0);

  readonly lineAmounts = computed(() => {
    this.tick();

    return this.form
      .getRawValue()
      .details.map((d) =>
        calcLine(d.quantity, d.rate, d.discountAmount, d.taxPercent),
      );
  });

  readonly totals = computed(() => {
    const lines = this.lineAmounts();

    const subTotal = round2(lines.reduce((sum, l) => sum + l.taxable, 0));
    const taxAmount = round2(lines.reduce((sum, l) => sum + l.taxAmount, 0));

    return { subTotal, taxAmount, totalAmount: round2(subTotal + taxAmount) };
  });

  /** Total quantity asked for per item (the same item may be on several lines). */
  private readonly demand = computed(() => {
    this.tick();

    const map = new Map<number, number>();

    for (const d of this.form.getRawValue().details) {
      if (d.itemmasterId) {
        map.set(
          d.itemmasterId,
          (map.get(d.itemmasterId) ?? 0) + Number(d.quantity ?? 0),
        );
      }
    }

    return map;
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.tick.update((n) => n + 1));
  }

  // ---------------- LOAD ----------------
  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);

    try {
      const [customers, items] = await Promise.all([
        firstValueFrom(this.lookup.getCustomers()),
        firstValueFrom(this.lookup.getItems()),
      ]);

      this.customers.set(customers.data ?? []);
      this.items.set(items.data ?? []);

      await this.loadStock();

      const id = Number(this.route.snapshot.paramMap.get('id'));

      if (id > 0) {
        await this.loadInvoice(id);
      }
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load the screen data'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadStock(): Promise<void> {
    const response = await firstValueFrom(this.stockService.getAll());

    this.stock.set(
      new Map((response.data ?? []).map((s) => [s.itemmasterId, s.onHandQuantity])),
    );
  }

  private async loadInvoice(id: number): Promise<void> {
    const response = await firstValueFrom(this.service.getById(id));
    const invoice: SalesInvoice = response.data;

    this.invoiceId.set(invoice.id);
    this.status.set(invoice.status);

    this.form.enable({ emitEvent: false });

    this.lines.clear();
    invoice.details.forEach((d) => this.lines.push(createLine(this.fb, d)));

    this.form.patchValue({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: new Date(invoice.invoiceDate),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
      customerId: invoice.customerId,
      notes: invoice.notes ?? '',
    });

    this.form.markAsPristine();

    // The invoice number cannot change after creation
    this.form.controls.invoiceNumber.disable({ emitEvent: false });

    if (invoice.status !== 'Draft') {
      this.form.disable();
    }
  }

  // ---------------- LINES ----------------
  addLine(): void {
    this.lines.push(createLine(this.fb));
    this.form.markAsDirty();
  }

  removeLine(index: number): void {
    this.lines.removeAt(index);
    this.form.markAsDirty();
  }

  /** When an item is picked, default the rate from the item master (if no rate yet). */
  onItemChange(line: LineGroup): void {
    const item = this.items().find(
      (i) => i.id === line.controls.itemmasterId.value,
    );

    if (item?.rate && line.controls.rate.value === 0) {
      line.controls.rate.setValue(item.rate);
    }
  }

  clearDueDate(): void {
    this.form.controls.dueDate.setValue(null);
    this.form.markAsDirty();
  }

  // ---------------- STOCK HINTS ----------------
  onHand(itemId: number | null): number {
    return itemId ? (this.stock().get(itemId) ?? 0) : 0;
  }

  /** The stock is only checked by the server when the invoice is posted - this is just an early warning. */
  isShort(itemId: number | null): boolean {
    return !!itemId && (this.demand().get(itemId) ?? 0) > this.onHand(itemId);
  }

  readonly anyShort = computed(() => {
    for (const [itemId, qty] of this.demand()) {
      if (qty > (this.stock().get(itemId) ?? 0)) {
        return true;
      }
    }

    return false;
  });

  // ---------------- SAVE ----------------
  async save(): Promise<void> {
    if (this.isReadOnly()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify('Please fix the highlighted errors');
      return;
    }

    const value = this.form.getRawValue();

    const request: SalesInvoiceRequest = {
      invoiceNumber: value.invoiceNumber.trim() || null,
      invoiceDate: toApiDate(value.invoiceDate as Date),
      dueDate: value.dueDate ? toApiDate(value.dueDate) : null,
      customerId: value.customerId as number,
      notes: value.notes,
      details: value.details.map((d) => ({
        itemmasterId: d.itemmasterId as number,
        quantity: Number(d.quantity),
        rate: Number(d.rate),
        discountAmount: Number(d.discountAmount),
        taxPercent: Number(d.taxPercent),
      })),
    };

    this.isSaving.set(true);

    try {
      const response = this.isEdit()
        ? await firstValueFrom(this.service.update(this.invoiceId(), request))
        : await firstValueFrom(this.service.create(request));

      if (!response.success) {
        this.notify(response.message || 'Save failed');
        return;
      }

      this.notify(
        this.isEdit()
          ? 'Sales invoice updated successfully'
          : 'Sales invoice created successfully',
      );

      this.form.markAsPristine();
      await this.router.navigate(['/transactions/sales-invoice']);
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to save the sales invoice'));
    } finally {
      this.isSaving.set(false);
    }
  }

  // ---------------- WORKFLOW ----------------
  post(): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Post Sales Invoice',
        message:
          'Post this invoice? The stock is checked and reduced. A posted invoice can no longer be edited.',
        confirmText: 'Post',
        confirmColor: 'primary',
      },
      () => firstValueFrom(this.service.post(this.invoiceId())),
      'Sales invoice posted',
    );
  }

  cancelInvoice(): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Cancel Sales Invoice',
        message: 'Cancel this invoice? This cannot be undone.',
        confirmText: 'Cancel Invoice',
        confirmColor: 'warn',
      },
      () => firstValueFrom(this.service.cancel(this.invoiceId())),
      'Sales invoice cancelled',
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

      await this.loadStock();
      await this.loadInvoice(this.invoiceId());
    } catch (error) {
      // e.g. "Insufficient stock for item A01 (available 2, required 5)."
      this.notify(getApiMessage(error, 'The operation failed'));
    }
  }

  goBack(): void {
    void this.router.navigate(['/transactions/sales-invoice']);
  }

  // ---------------- TEMPLATE HELPERS ----------------
  statusClass(): string {
    return `status-${this.status().toLowerCase()}`;
  }

  itemLabel(item: Itemmaster): string {
    return `${item.itemCode} - ${item.itemName}`;
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 5000 });
  }
}
