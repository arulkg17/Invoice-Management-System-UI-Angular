import { Component, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UserService } from '../../services/user.service';
import { UserRequest } from '../../models/user';

// Confirm password validator
function passwordMatchValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(UserService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSaving = signal(false);

  readonly form = this.fb.group(
    {
      userName: ['', [Validators.required, Validators.maxLength(50)]],

      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(100)],
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100),
        ],
      ],

      confirmPassword: ['', Validators.required],

      firstName: ['', [Validators.required, Validators.maxLength(50)]],

      lastName: ['', [Validators.required, Validators.maxLength(50)]],

      phoneNumber: ['', [Validators.required, Validators.maxLength(20)]],
    },
    {
      validators: passwordMatchValidator,
    },
  );

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    const v = this.form.getRawValue();

    const request: UserRequest = {
      userName: v.userName.trim(),
      email: v.email.trim(),
      password: v.password,

      firstName: v.firstName.trim(),
      middleName: null,
      lastName: v.lastName.trim(),
      displayName: `${v.firstName.trim()} ${v.lastName.trim()}`,

      phoneNumber: v.phoneNumber.trim(),
      alternatePhone: null,

      addressLine1: '',
      addressLine2: null,
      city: '',
      state: '',
      zipCode: '',
      country: '',

      dateOfBirth: null,
      isActive: true,
    };

    try {
      const response = await this.service.create(request);

      if (response) {
        this.snackBar.open(
          'Account created successfully. Please log in.',
          'Close',
          { duration: 4000 },
        );

        await this.router.navigate(['/home']);
      } else {
        this.snackBar.open(
           'Unable to create account.',
          'Close',
          { duration: 4000 },
        );
      }
    } catch (error: any) {
      const message =
        error?.error?.message ||
        error?.error?.Message ||
        'Registration failed. Please try again.';

      this.snackBar.open(message, 'Close', { duration: 5000 });
    } finally {
      this.isSaving.set(false);
    }
  }
}
