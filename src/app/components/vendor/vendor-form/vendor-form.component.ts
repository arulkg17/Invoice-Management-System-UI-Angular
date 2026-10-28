import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { VendorService } from '../../../services/vendor.service';
import { VendorRequest } from '../../../models/vendor';
import { getApiMessage } from '../../../shared/api-helpers';
import { failMessage, isOk } from '../../../shared/api-result';

@Component({
  selector: 'app-vendor-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressBarModule,
  ],
  templateUrl: './vendor-form.component.html',
  styleUrl: '../../../shared/master-page.css',
})
export class VendorFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(VendorService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly vendorId = signal(0);
  readonly isEdit = computed(() => this.vendorId() > 0);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly form = this.fb.group({
    vendorCode: ['', [Validators.required, Validators.maxLength(20)]],
    vendorName: ['', [Validators.required, Validators.maxLength(100)]],
    city: ['', Validators.maxLength(50)],
    state: ['', Validators.maxLength(50)],
    isActive: [true],
  });

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id > 0) {
      this.vendorId.set(id);
      await this.load(id);
    }
  }

  private async load(id: number): Promise<void> {
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(this.service.getById(id));

      if (!response.success || !response.data) {
        this.notify(response.message || 'Vendor not found');
        this.goBack();
        return;
      }

      const c = response.data;

      this.form.patchValue({
        vendorCode: c.vendorCode,
        vendorName: c.vendorName,
        city: c.city ?? '',
        state: c.state ?? '',
        isActive: c.isActive ?? true,
      });

      this.form.markAsPristine();
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load the vendor'));
      this.goBack();
    } finally {
      this.isLoading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify('Please fix the highlighted errors');
      return;
    }

    const value = this.form.getRawValue();

    const request: VendorRequest = {
      vendorCode: value.vendorCode.trim(),
      vendorName: value.vendorName.trim(),
      city: value.city.trim() || null,
      state: value.state.trim() || null,
      isActive: value.isActive,
    };

    this.isSaving.set(true);

    try {
      const response = this.isEdit()
        ? await firstValueFrom(this.service.update(this.vendorId(), request))
        : await firstValueFrom(this.service.create(request));

      if (!isOk(response)) {
        this.notify(failMessage(response, 'Save failed'));
        return;
      }

      this.notify(this.isEdit() ? 'Vendor updated successfully' : 'Vendor created successfully');

      this.form.markAsPristine();
      this.goBack();
    } catch (error) {
      // e.g. duplicate code
      this.notify(getApiMessage(error, 'Unable to save the vendor'));
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    void this.router.navigate(['/masters/vendors']);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000 });
  }
}
