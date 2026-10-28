import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
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

import { VendorService } from '../../../services/vendor.service';
import { Vendor, VendorFilter } from '../../../models/vendor';
import { getApiMessage } from '../../../shared/api-helpers';
import { failMessage, isOk } from '../../../shared/api-result';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-vendor-list',
  standalone: true,
  imports: [
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
  templateUrl: './vendor-list.component.html',
  styleUrl: '../../../shared/master-page.css',
})
export class VendorListComponent implements OnInit {
  private readonly service = inject(VendorService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'vendorCode',
    'vendorName',
    'city',
    'state',
    'status',
    'actions',
  ];

  readonly vendors = signal<Vendor[]>([]);
  readonly isLoading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  // SEARCH FILTERS
  readonly filterForm = this.fb.group({
    vendorCode: [''],
    vendorName: [''],
    city: [''],
    isActive: [null as boolean | null],
  });

  constructor() {
    // search while typing (wait 400 ms after the last key)
    this.filterForm.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex.set(0);
        void this.load();
      });
  }

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.isLoading.set(true);

    try {
      const value = this.filterForm.getRawValue();

      const filter: VendorFilter = {
        vendorCode: value.vendorCode ?? '',
        vendorName: value.vendorName ?? '',
        city: value.city ?? '',
        isActive: value.isActive,
        pageNumber: this.pageIndex() + 1,
        pageSize: this.pageSize(),
      };

      const response = await firstValueFrom(this.service.getPaged(filter));

      if (!response.success) {
        this.notify(response.message || 'Unable to load vendors');
        return;
      }

      this.vendors.set(response.data?.data ?? []);
      this.totalRecords.set(response.data?.totalRecords ?? 0);
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load vendors'));
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilters(): void {
    this.filterForm.reset({
      vendorCode: '',
      vendorName: '',
      city: '',
      isActive: null,
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    void this.load();
  }

  // ---------------- NAVIGATION ----------------
  add(): void {
    void this.router.navigate(['/masters/vendors/create']);
  }

  edit(c: Vendor): void {
    void this.router.navigate(['/masters/vendors/edit', c.id]);
  }

  // ---------------- DELETE ----------------
  async remove(c: Vendor): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, { width: '420px', data: { name: c.vendorName } })
        .afterClosed(),
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await firstValueFrom(this.service.delete(c.id));

      this.notify(
        isOk(response)
          ? `${c.vendorName} deleted`
          : failMessage(response, 'Delete failed'),
      );

      await this.load();
    } catch (error) {
      // e.g. "Vendor is used in sales invoices and cannot be deleted"
      this.notify(getApiMessage(error, 'Delete failed'));
    }
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000 });
  }
}
