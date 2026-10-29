import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { UserService } from '../../../services/user.service';
import { UserRequest } from '../../../models/user';
import { getApiMessage, toApiDate } from '../../../shared/api-helpers';
import { failMessage, isOk } from '../../../shared/api-result';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatProgressBarModule,
  ],
  templateUrl: './user-form.component.html',
  styleUrl: '../../../shared/master-page.css',
})
export class UserFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(UserService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly userId = signal(0);
  readonly isEdit = computed(() => this.userId() > 0);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly form = this.fb.group({
    // Account
    userName: ['', [Validators.required, Validators.maxLength(50)]],
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(100)],
    ],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(100)],
    ],
    isActive: [true],
    // Name
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    middleName: ['', Validators.maxLength(50)],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    displayName: ['', Validators.maxLength(100)],

    // Contact
    phoneNumber: ['', [Validators.required, Validators.maxLength(20)]],
    alternatePhone: ['', Validators.maxLength(20)],
    dateOfBirth: [null as Date | null],

    // Address
    addressLine1: ['', [Validators.required, Validators.maxLength(150)]],
    addressLine2: ['', Validators.maxLength(150)],
    city: ['', [Validators.required, Validators.maxLength(50)]],
    state: ['', [Validators.required, Validators.maxLength(50)]],
    zipCode: ['', [Validators.required, Validators.maxLength(15)]],
    country: ['', [Validators.required, Validators.maxLength(50)]],
  });

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id > 0) {
      this.userId.set(id);
      this.form.controls.password.clearValidators();
      this.form.controls.password.updateValueAndValidity();
      await this.load(id);
    }
  }

  private async load(id: number): Promise<void> {
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(this.service.getById(id));

      if (!response.success || !response.data) {
        this.notify(response.message || 'User not found');
        this.goBack();
        return;
      }

      const u = response.data;

      this.form.patchValue({
        userName: u.userName,
        email: u.email,
        isActive: u.isActive,
        firstName: u.firstName,
        middleName: u.middleName ?? '',
        lastName: u.lastName,
        displayName: u.displayName,
        phoneNumber: u.phoneNumber,
        alternatePhone: u.alternatePhone ?? '',
        dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth) : null,
        addressLine1: u.addressLine1,
        addressLine2: u.addressLine2 ?? '',
        city: u.city,
        state: u.state,
        zipCode: u.zipCode,
        country: u.country,
      });

      this.form.markAsPristine();
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load the user'));
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

    const v = this.form.getRawValue();

    const request: UserRequest = {
      userName: v.userName.trim(),
      email: v.email.trim(),
      firstName: v.firstName.trim(),
      middleName: v.middleName.trim() || null,
      lastName: v.lastName.trim(),
      // blank display name -> "First Last"
      displayName:
        v.displayName.trim() || `${v.firstName.trim()} ${v.lastName.trim()}`,
      phoneNumber: v.phoneNumber.trim(),
      alternatePhone: v.alternatePhone.trim() || null,
      addressLine1: v.addressLine1.trim(),
      addressLine2: v.addressLine2.trim() || null,
      city: v.city.trim(),
      state: v.state.trim(),
      zipCode: v.zipCode.trim(),
      country: v.country.trim(),
      dateOfBirth: v.dateOfBirth ? toApiDate(v.dateOfBirth) : null,
      isActive: v.isActive,
      ...(!this.isEdit() ? { password: v.password } : {}),
    };

    this.isSaving.set(true);

    try {
      const response = this.isEdit()
        ? await firstValueFrom(this.service.update(this.userId(), request))
        : await firstValueFrom(this.service.create(request));

      if (!isOk(response)) {
        this.notify(failMessage(response, 'Save failed'));
        return;
      }

      this.notify(
        this.isEdit()
          ? 'User updated successfully'
          : 'User created successfully',
      );

      this.form.markAsPristine();
      this.goBack();
    } catch (error) {
      // e.g. duplicate user name / email
      this.notify(getApiMessage(error, 'Unable to save the user'));
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    void this.router.navigate(['/masters/users']);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000 });
  }
}
