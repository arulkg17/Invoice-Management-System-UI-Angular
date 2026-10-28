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

import { ReceiptService } from '../../../services/receipt.service';
import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { LookupService } from '../../../services/lookup.service';
import {
  Receipt,
  ReceiptDetail,
  ReceiptRequest,
} from '../../../models/receipt';
import { PurchaseOrder } from '../../../models/purchase-order';
import { Vendor } from '../../../models/vendor';
import { Itemmaster } from '../../../models/itemmaster';
import { getApiMessage, toApiDate } from '../../../shared/api-helpers';
import { calcLine, round2 } from '../../../shared/money';
import { SelectOnFocusDirective } from '../../../custom-directives/select-on-focus.directive';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PdfViewerService } from '../../../shared/pdf-viewer.service';

// ---------------------------------------------------------------------------
// One receipt line = one purchase order line + the quantity received now
// ---------------------------------------------------------------------------
interface PoLineInfo {
  purchaseOrderDetailId: number;
  itemmasterId: number;
  orderedQuantity: number;
  alreadyReceived: number;
  rate: number;
  poDiscount: number;
  taxPercent: number;
}

/** Cannot receive more than what is still outstanding on the PO line. */
function notAboveOutstanding(group: AbstractControl): ValidationErrors | null {
  const received = Number(group.get('receivedQuantity')?.value ?? 0);
  const outstanding = Number(group.get('outstanding')?.value ?? 0);

  return received > outstanding ? { exceedsOutstanding: true } : null;
}

/** At least one line must have a quantity greater than zero. */
function atLeastOneQuantity(control: AbstractControl): ValidationErrors | null {
  const groups = (control as unknown as { controls: AbstractControl[] })
    .controls;

  return groups.some((g) => Number(g.get('receivedQuantity')?.value) > 0)
    ? null
    : { noQuantity: true };
}

function createLine(
  fb: NonNullableFormBuilder,
  info: PoLineInfo,
  receivedQuantity: number,
) {
  return fb.group(
    {
      purchaseOrderDetailId: fb.control(info.purchaseOrderDetailId),
      itemmasterId: fb.control(info.itemmasterId),
      orderedQuantity: fb.control(info.orderedQuantity),
      alreadyReceived: fb.control(info.alreadyReceived),
      outstanding: fb.control(
        round2(info.orderedQuantity - info.alreadyReceived),
      ),
      rate: fb.control(info.rate),
      poDiscount: fb.control(info.poDiscount),
      taxPercent: fb.control(info.taxPercent),
      receivedQuantity: fb.control(receivedQuantity, [
        Validators.required,
        Validators.min(0),
      ]),
    },
    { validators: notAboveOutstanding },
  );
}

type LineGroup = ReturnType<typeof createLine>;

@Component({
  selector: 'app-receipt-form',
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
  templateUrl: './receipt-form.component.html',
  styleUrl: './receipt-form.component.css',
})
export class ReceiptFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(ReceiptService);
  private readonly poService = inject(PurchaseOrderService);
  private readonly lookup = inject(LookupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly pdfViewer = inject(PdfViewerService);
  // ---------------- FORM ----------------
  readonly form = this.fb.group({
    receiptNumber: this.fb.control('', Validators.maxLength(30)),
    receiptDate: this.fb.control<Date | null>(new Date(), Validators.required),
    purchaseOrderId: this.fb.control<number | null>(null, Validators.required),
    notes: this.fb.control('', Validators.maxLength(500)),
    details: this.fb.array<LineGroup>([], atLeastOneQuantity),
  });

  get lines() {
    return this.form.controls.details;
  }

  // ---------------- SCREEN STATE ----------------
  readonly vendors = signal<Vendor[]>([]);
  readonly items = signal<Itemmaster[]>([]);
  readonly purchaseOrders = signal<PurchaseOrder[]>([]);
  readonly selectedPo = signal<PurchaseOrder | null>(null);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly receiptId = signal(0);
  readonly status = signal('Draft');

  /** Lines of a posted / cancelled receipt exactly as saved by the server. */
  readonly savedDetails = signal<ReceiptDetail[]>([]);
  private readonly savedTotals = signal({
    subTotal: 0,
    taxAmount: 0,
    totalAmount: 0,
  });

  readonly isEdit = computed(() => this.receiptId() > 0);
  readonly isReadOnly = computed(() => this.status() !== 'Draft');
  readonly canCancelReceipt = computed(
    () => this.isEdit() && ['Draft', 'Posted'].includes(this.status()),
  );

  readonly title = computed(() => {
    if (!this.isEdit()) {
      return 'New Receipt';
    }

    return this.isReadOnly() ? 'View Receipt' : 'Edit Receipt';
  });

  /** New receipts can only be made for Approved / PartiallyReceived purchase orders. */
  readonly poOptions = computed(() =>
    this.isEdit()
      ? this.purchaseOrders()
      : this.purchaseOrders().filter((p) =>
          ['Approved', 'PartiallyReceived'].includes(p.status),
        ),
  );

  readonly vendorName = computed(() => {
    const po = this.selectedPo();

    if (!po) {
      return '';
    }

    const vendor = this.vendors().find((v) => v.id === po.vendorId);

    return vendor
      ? `${vendor.vendorCode} - ${vendor.vendorName}`
      : `#${po.vendorId}`;
  });

  // The form is not a signal, so a counter tells the computed values to refresh
  private readonly tick = signal(0);

  /**
   * Same maths as the server: the PO line discount is pro-rated by the quantity received now,
   * rate and tax % come from the PO line.
   */
  readonly lineAmounts = computed(() => {
    this.tick();

    return this.form.getRawValue().details.map((d) => {
      const discount =
        d.orderedQuantity === 0
          ? 0
          : round2(
              (d.poDiscount * (d.receivedQuantity ?? 0)) / d.orderedQuantity,
            );

      return calcLine(d.receivedQuantity, d.rate, discount, d.taxPercent);
    });
  });

  readonly totals = computed(() => {
    if (this.isReadOnly()) {
      return this.savedTotals();
    }

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
      const [vendors, items, orders] = await Promise.all([
        firstValueFrom(this.lookup.getVendors()),
        firstValueFrom(this.lookup.getItems()),
        firstValueFrom(this.poService.getAll()),
      ]);

      this.vendors.set(vendors.data ?? []);
      this.items.set(items.data ?? []);
      this.purchaseOrders.set(orders.data ?? []);

      const id = Number(this.route.snapshot.paramMap.get('id'));

      if (id > 0) {
        await this.loadReceipt(id);
      }
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load the screen data'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadReceipt(id: number): Promise<void> {
    const response = await firstValueFrom(this.service.getById(id));
    const receipt: Receipt = response.data;

    this.receiptId.set(receipt.id);
    this.status.set(receipt.status);
    this.savedDetails.set(receipt.details);
    this.savedTotals.set({
      subTotal: receipt.subTotal,
      taxAmount: receipt.taxAmount,
      totalAmount: receipt.totalAmount,
    });

    this.form.enable({ emitEvent: false });

    this.form.patchValue({
      receiptNumber: receipt.receiptNumber,
      receiptDate: new Date(receipt.receiptDate),
      purchaseOrderId: receipt.purchaseOrderId,
      notes: receipt.notes ?? '',
    });

    // Lines of a Draft receipt are built from the PO so the outstanding quantity is known
    await this.buildLinesFromPo(receipt.purchaseOrderId, receipt.details);

    this.form.markAsPristine();

    // PO and receipt number cannot change after creation
    this.form.controls.purchaseOrderId.disable({ emitEvent: false });
    this.form.controls.receiptNumber.disable({ emitEvent: false });

    if (receipt.status !== 'Draft') {
      this.form.disable();
    }
  }

  /** New receipt: the user picked a purchase order. */
  async onPoChange(poId: number | null): Promise<void> {
    if (!poId) {
      this.lines.clear();
      this.selectedPo.set(null);
      return;
    }

    this.isLoading.set(true);

    try {
      await this.buildLinesFromPo(poId, null);

      if (this.lines.length === 0) {
        this.notify('This purchase order has nothing left to receive.');
      }
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load the purchase order'));
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * existing = null  -> new receipt: every PO line with something outstanding, default = outstanding
   * existing = lines -> Draft receipt: every PO line, quantity = what the receipt already has (or 0)
   */
  private async buildLinesFromPo(
    poId: number,
    existing: ReceiptDetail[] | null,
  ): Promise<void> {
    const po = (await firstValueFrom(this.poService.getById(poId))).data;

    this.selectedPo.set(po);
    this.lines.clear();

    for (const d of po.details) {
      const outstanding = round2(d.quantity - d.receivedQuantity);
      const saved = existing?.find((e) => e.purchaseOrderDetailId === d.id);

      if (!existing && outstanding <= 0) {
        continue;
      }

      const quantity = existing ? (saved?.receivedQuantity ?? 0) : outstanding;

      this.lines.push(
        createLine(
          this.fb,
          {
            purchaseOrderDetailId: d.id,
            itemmasterId: d.itemmasterId,
            orderedQuantity: d.quantity,
            alreadyReceived: d.receivedQuantity,
            rate: d.rate,
            poDiscount: d.discountAmount,
            taxPercent: d.taxPercent,
          },
          quantity,
        ),
      );
    }
  }

  /** Quick helpers on a line */
  receiveAll(line: LineGroup): void {
    line.controls.receivedQuantity.setValue(line.controls.outstanding.value);
    this.form.markAsDirty();
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

    const request: ReceiptRequest = {
      receiptNumber: value.receiptNumber.trim() || null,
      receiptDate: toApiDate(value.receiptDate as Date),
      purchaseOrderId: value.purchaseOrderId as number,
      notes: value.notes,
      // lines with 0 are simply not received now
      details: value.details
        .filter((d) => Number(d.receivedQuantity) > 0)
        .map((d) => ({
          purchaseOrderDetailId: d.purchaseOrderDetailId,
          receivedQuantity: Number(d.receivedQuantity),
        })),
    };

    this.isSaving.set(true);

    try {
      const response = this.isEdit()
        ? await firstValueFrom(this.service.update(this.receiptId(), request))
        : await firstValueFrom(this.service.create(request));

      if (!response.success) {
        this.notify(response.message || 'Save failed');
        return;
      }

      this.notify(
        this.isEdit()
          ? 'Receipt updated successfully'
          : 'Receipt created successfully',
      );

      // NEW: show the saved receipt as a PDF before leaving the screen
      const savedId = this.isEdit() ? this.receiptId() : Number(response.data);
      this.form.markAsPristine();
      await this.showSavedCopy(savedId);

      await this.router.navigate(['/transactions/receipt']);
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to save the receipt'));
    } finally {
      this.isSaving.set(false);
    }
  }

  // ---------------- WORKFLOW ----------------
  post(): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Post Receipt',
        message:
          'Post this receipt? The goods are added to stock and the purchase order is updated. A posted receipt can no longer be edited.',
        confirmText: 'Post',
        confirmColor: 'primary',
      },
      () => firstValueFrom(this.service.post(this.receiptId())),
      'Receipt posted',
    );
  }
  viewPdf(): void {
    this.pdfViewer
      .preview('Receipt', this.receiptId(), 'Goods Receipt')
      .subscribe();
  }

  /** Shows the saved receipt; closing the dialog continues to the list. */
  private async showSavedCopy(id: number): Promise<void> {
    await firstValueFrom(
      this.pdfViewer.preview('Receipt', id, 'Goods Receipt'),
    );
  }
  cancelReceipt(): Promise<void> {
    return this.confirmAndRun(
      {
        title: 'Cancel Receipt',
        message: 'Cancel this receipt? This cannot be undone.',
        confirmText: 'Cancel Receipt',
        confirmColor: 'warn',
      },
      () => firstValueFrom(this.service.cancel(this.receiptId())),
      'Receipt cancelled',
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

      await this.loadReceipt(this.receiptId());
    } catch (error) {
      this.notify(getApiMessage(error, 'The operation failed'));
    }
  }

  goBack(): void {
    void this.router.navigate(['/transactions/receipt']);
  }

  // ---------------- TEMPLATE HELPERS ----------------
  statusClass(): string {
    return `status-${this.status().toLowerCase()}`;
  }

  itemName(itemId: number): string {
    const item = this.items().find((i) => i.id === itemId);

    return item ? `${item.itemCode} - ${item.itemName}` : `#${itemId}`;
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 5000 });
  }
}
