
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Customer, CustomerFilter } from '../../models/customer';
import { CustomerService } from '../../services/customer.service';
import { ApiResponse } from '../../models/api-response';
import { PagedResult } from '../../models/paged-result';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { CustomerFormComponent } from './customer-form.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatDialogModule
  ],
  templateUrl: './customer-list.component.html'
})
export class CustomerListComponent implements OnInit {
  private readonly service = inject(CustomerService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  dataSource = new MatTableDataSource<Customer>([]);
  displayedColumns = [
    'customerCode',
    'customerName',
    'contactPerson',
    'mobileNo',
    'city',
    'isActive',
    'actions'
  ];

  filterForm = this.fb.group({
    customerCode: [''],
    customerName: [''],
    mobileNo: [''],
    city: ['']
  });

  isLoading = false;
  pageSize = 10;
  pageIndex = 0;
  totalRecords = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.filterForm.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.pageIndex = 0;
        void this.loadCustomers();
      });

    void this.loadCustomers();
  }

  async loadCustomers(): Promise<void> {
    this.isLoading = true;

    const values = this.filterForm.getRawValue();

    const filter: CustomerFilter = {
      customerCode: values.customerCode?.trim() ?? '',
      customerName: values.customerName?.trim() ?? '',
      mobileNo: values.mobileNo?.trim() ?? '',
      city: values.city?.trim() ?? '',
      pageNumber: this.pageIndex + 1,
      pageSize: this.pageSize
    };

    try {
      const response: ApiResponse<PagedResult<Customer>> =
        await firstValueFrom(this.service.getPaged(filter));

      if (!response.success || !response.data) {
        this.dataSource.data = [];
        this.totalRecords = 0;
        this.snackBar.open(
          response.message || 'Unable to load customers',
          'Close',
          { duration: 3000 }
        );
        return;
      }

      this.dataSource.data = response.data.data ?? [];
      this.totalRecords = response.data.totalRecords;
    } catch (error: any) {
      this.snackBar.open(
        error?.error?.message || 'Customer loading failed. Check the API and login.',
        'Close',
        { duration: 3500 }
      );
    } finally {
      this.isLoading = false;
    }
  }

  clearFilters(): void {
    this.filterForm.reset({
      customerCode: '',
      customerName: '',
      mobileNo: '',
      city: ''
    }, { emitEvent: false });

    this.pageIndex = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }

    void this.loadCustomers();
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    void this.loadCustomers();
  }

  openAddDialog(): void {
    const ref = this.dialog.open(CustomerFormComponent, {
      width: '850px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: null
    });

    ref.afterClosed().subscribe(result => {
      if (result === true) {
        void this.loadCustomers();
      }
    });
  }

  openEditDialog(customer: Customer): void {
    const ref = this.dialog.open(CustomerFormComponent, {
      width: '850px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: { ...customer }
    });

    ref.afterClosed().subscribe(result => {
      if (result === true) {
        void this.loadCustomers();
      }
    });
  }

  async delete(customer: Customer): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { name: customer.customerName }
    });

    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;

    try {
      const response = await firstValueFrom(
        this.service.delete(customer.id)
      );

      if (!response.success) {
        this.snackBar.open(
          response.message || 'Unable to delete customer',
          'Close',
          { duration: 3000 }
        );
        return;
      }

      this.snackBar.open(
        response.message || 'Customer deleted successfully',
        'Close',
        { duration: 2500 }
      );

      // Return to the previous page if the last row was deleted.
      if (this.dataSource.data.length === 1 && this.pageIndex > 0) {
        this.pageIndex--;
        if (this.paginator) {
          this.paginator.pageIndex = this.pageIndex;
        }
      }

      await this.loadCustomers();
    } catch (error: any) {
      this.snackBar.open(
        error?.error?.message || 'Customer delete failed',
        'Close',
        { duration: 3000 }
      );
    }
  }
}