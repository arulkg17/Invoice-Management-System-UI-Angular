
import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Customer } from '../../models/customer';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule
  ],
  templateUrl: './customer-form.component.html'
})
export class CustomerFormComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(CustomerService);
  private readonly snackBar = inject(MatSnackBar);

  saving = false;

  form = this.fb.group({
    customerCode: ['', [Validators.required, Validators.maxLength(20)]],
    customerName: ['', [Validators.required, Validators.maxLength(100)]],
    contactPerson: ['', Validators.maxLength(100)],
    mobileNo: ['', Validators.maxLength(20)],
    email: ['', [Validators.email, Validators.maxLength(100)]],
    address1: ['', Validators.maxLength(200)],
    address2: ['', Validators.maxLength(200)],
    city: ['', Validators.maxLength(100)],
    state: ['', Validators.maxLength(100)],
    country: ['', Validators.maxLength(100)],
    zipCode: ['', Validators.maxLength(20)],
    gstNo: ['', Validators.maxLength(50)],
    isActive: [true]
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Customer | null,
    private readonly dialogRef: MatDialogRef<CustomerFormComponent>
  ) {
    if (data) {
      this.form.patchValue({
        customerCode: data.customerCode ?? '',
        customerName: data.customerName ?? '',
        contactPerson: data.contactPerson ?? '',
        mobileNo: data.mobileNo ?? '',
        email: data.email ?? '',
        address1: data.address1 ?? '',
        address2: data.address2 ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        country: data.country ?? '',
        zipCode: data.zipCode ?? '',
        gstNo: data.gstNo ?? '',
        isActive: data.isActive ?? true
      });
    }
  }

  get isEdit(): boolean {
    return !!this.data?.id;
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    const customer: Customer = {
      ...this.form.getRawValue(),
      id: this.data?.id ?? 0
    };

    try {
      const response = this.isEdit
        ? await firstValueFrom(
            this.service.update(this.data!.id, customer)
          )
        : await firstValueFrom(this.service.create(customer));

      if (!response.success) {
        this.snackBar.open(
          response.message || 'Unable to save customer',
          'Close',
          { duration: 3000 }
        );
        return;
      }

      this.snackBar.open(
        response.message || 'Customer saved successfully',
        'Close',
        { duration: 2500 }
      );

      this.dialogRef.close(true);
    } catch (error: any) {
      this.snackBar.open(
        error?.error?.message || 'Customer save failed',
        'Close',
        { duration: 3000 }
      );
    } finally {
      this.saving = false;
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}