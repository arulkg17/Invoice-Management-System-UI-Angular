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

import { CustomerService } from '../../../services/customer.service';
import { Customer, CustomerFilter } from '../../../models/customer';
import { getApiMessage } from '../../../shared/api-helpers';
import { failMessage, isOk } from '../../../shared/api-result';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-customer-list',
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
  templateUrl: './customer-list.component.html',
  styleUrl: '../../../shared/master-page.css',
})
export class CustomerListComponent implements OnInit {
  private readonly service = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'customerCode',
    'customerName',
    'city',
    'state',
    'status',
    'actions',
  ];

  readonly customers = signal<Customer[]>([]);
  readonly isLoading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  // SEARCH FILTERS
  readonly filterForm = this.fb.group({
    customerCode: [''],
    customerName: [''],
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

      const filter: CustomerFilter = {
        customerCode: value.customerCode ?? '',
        customerName: value.customerName ?? '',
        city: value.city ?? '',
        isActive: value.isActive,
        pageNumber: this.pageIndex() + 1,
        pageSize: this.pageSize(),
      };

      const response = await firstValueFrom(this.service.getPaged(filter));

      if (!response.success) {
        this.notify(response.message || 'Unable to load customers');
        return;
      }

      this.customers.set(response.data?.data ?? []);
      this.totalRecords.set(response.data?.totalRecords ?? 0);
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load customers'));
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilters(): void {
    this.filterForm.reset({
      customerCode: '',
      customerName: '',
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
    void this.router.navigate(['/masters/customers/create']);
  }

  edit(c: Customer): void {
    void this.router.navigate(['/masters/customers/edit', c.id]);
  }

  // ---------------- DELETE ----------------
  async remove(c: Customer): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, { width: '420px', data: { name: c.customerName } })
        .afterClosed(),
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await firstValueFrom(this.service.delete(c.id));

      this.notify(
        isOk(response)
          ? `${c.customerName} deleted`
          : failMessage(response, 'Delete failed'),
      );

      await this.load();
    } catch (error) {
      // e.g. "Customer is used in sales invoices and cannot be deleted"
      this.notify(getApiMessage(error, 'Delete failed'));
    }
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000 });
  }
}
