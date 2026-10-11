import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
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

import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { LookupService } from '../../../services/lookup.service';
import {
  PurchaseOrder,
  PurchaseOrderDetail,
  PurchaseOrderRequest,
} from '../../../models/purchase-order';
import { Vendor } from '../../../models/vendor';
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

/** A purchase order needs at least one line. */
function atLeastOneLine(control: AbstractControl): ValidationErrors | null {
  const lines = control as unknown as { length: number };

  return lines.length > 0 ? null : { noLines: true };
}

/** One line of the purchase order (a FormGroup inside the FormArray). */
function createLine(
  fb: NonNullableFormBuilder,
  line?: Partial<PurchaseOrderDetail>,
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
      receivedQuantity: fb.control(line?.receivedQuantity ?? 0),
    },
    { validators: discountNotAboveAmount },
  );
}

type LineGroup = ReturnType<typeof createLine>;

@Component({
  selector: 'app-po-form',
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
  templateUrl: './po-form.component.html',
  styleUrl: './po-form.component.css',
})
export class PoFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(PurchaseOrderService);
  private readonly lookup = inject(LookupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // ---------------- FORM ----------------
  readonly form = this.fb.group({
    poNumber: this.fb.control('', [
      Validators.required,
      Validators.maxLength(30),
    ]),
    poDate: this.fb.control<Date | null>(new Date(), Validators.required),
    vendorId: this.fb.control<number | null>(null, Validators.required),
    notes: this.fb.control('', Validators.maxLength(500)),
    details: this.fb.array<LineGroup>([createLine(this.fb)], atLeastOneLine),
  });

  get lines() {
    return this.form.controls.details;
  }

  // ---------------- SCREEN STATE ----------------
  readonly vendors = signal<Vendor[]>([]);
  readonly items = signal<Itemmaster[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly poId = signal(0);
  readonly status = signal('Draft');

  readonly isEdit = computed(() => this.poId() > 0);
  /** Only Draft purchase orders can be edited. */
  readonly isReadOnly = computed(() => this.status() !== 'Draft');
  readonly canCancelOrder = computed(
    () => this.isEdit() && ['Draft', 'Approved'].includes(this.status()),
  );

  readonly title = computed(() => {
    if (!this.isEdit()) {
      return 'New Purchase Order';
    }

    return this.isReadOnly() ? 'View Purchase Order' : 'Edit Purchase Order';
  });

  // The form is not a signal, so a counter tells the computed values to refresh
  private readonly tick = signal(0);

  /** Amounts per line - the same maths the server uses. */
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

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.tick.update((n) => n + 1));
  }

  // ---------------- LOAD ----------------
  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);

    try {
      const [vendors, items] = await Promise.all([
        firstValueFrom(this.lookup.getVendors()),
        firstValueFrom(this.lookup.getItems()),
      ]);

      this.vendors.set(vendors.data ?? []);
      this.items.set(items.data ?? []);

      const id = Number(this.route.snapshot.paramMap.get('id'));

      if (id > 0) {
        await this.loadOrder(id);
      } else {
        this.generatePoNumber();
      }
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load the screen data'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadOrder(id: number): Promise<void> {
    const response = await firstValueFrom(this.service.getById(id));
    const po: PurchaseOrder = response.data;

    this.poId.set(po.id);
    this.status.set(po.status);

    this.form.enable({ emitEvent: false });

    this.lines.clear();
    po.details.forEach((d) => this.lines.push(createLine(this.fb, d)));

    this.form.patchValue({
      poNumber: po.poNumber,
      poDate: new Date(po.poDate),
      vendorId: po.vendorId,
      notes: po.notes ?? '',
    });

    this.form.markAsPristine();

    if (po.status !== 'Draft') {
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

  generatePoNumber(): void {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    const stamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    this.form.controls.poNumber.setValue(`PO-${stamp}`);
  }

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

    const request: PurchaseOrderRequest = {
      poNumber: value.poNumber.trim(),
      poDate: toApiDate(value.poDate as Date),
      vendorId: value.vendorId as number,
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
        ? await firstValueFrom(this.service.update(this.poId(), request))
        : await firstValueFrom(this.service.create(request));

      if (!response.success) {
        this.notify(response.message || 'Save failed');
        return;
      }

      this.notify(
        this.isEdit()
          ? 'Purchase order updated successfully'
          : 'Purchase order created successfully',
      );

      this.form.markAsPristine();
      await this.router.navigate(['/transactions/po']);
    } catch (error) {
      // e.g. "A record with the same unique value ... already exists." (duplicate PO number)
      this.notify(getApiMessage(error, 'Unable to save the purchase order'));
    } finally {
      this.isSaving.set(false);
    }
  }

  // ---------------- WORKFLOW ----------------
  approve(): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Approve Purchase Order',
        message:
          'Approve this purchase order? It can no longer be edited after approval.',
        confirmText: 'Approve',
        confirmColor: 'primary',
      },
      () => firstValueFrom(this.service.approve(this.poId())),
      'Purchase order approved',
    );
  }

  cancelOrder(): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Cancel Purchase Order',
        message: 'Cancel this purchase order? This cannot be undone.',
        confirmText: 'Cancel PO',
        confirmColor: 'warn',
      },
      () => firstValueFrom(this.service.cancel(this.poId())),
      'Purchase order cancelled',
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

      // Reload so the new status is shown (the screen becomes read-only)
      await this.loadOrder(this.poId());
    } catch (error) {
      this.notify(getApiMessage(error, 'The operation failed'));
    }
  }

  goBack(): void {
    void this.router.navigate(['/transactions/po']);
  }

  // ---------------- TEMPLATE HELPERS ----------------
  statusClass(): string {
    return `status-${this.status().toLowerCase()}`;
  }

  itemLabel(item: Itemmaster): string {
    return `${item.itemCode} - ${item.itemName}`;
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000 });
  }
}
