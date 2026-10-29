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

import { CategoryService } from '../../../services/category1.service';
import { CategoryRequest } from '../../../models/category';
import { getApiMessage } from '../../../shared/api-helpers';
import { failMessage, isOk } from '../../../shared/api-result';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressBarModule,
  ],
  templateUrl: './category-form.component.html',
  styleUrl: '../../../shared/master-page.css',
})
export class CategoryFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly categoryId = signal(0);
  readonly isEdit = computed(() => this.categoryId() > 0);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(5)]],
    name: ['', [Validators.required, Validators.maxLength(25)]],
    description: ['', Validators.maxLength(100)],
    isActive: [true],
  });

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id > 0) {
      this.categoryId.set(id);
      await this.load(id);
    }
  }

  private async load(id: number): Promise<void> {
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(this.service.getById(id));

      if (!response.success || !response.data) {
        this.notify(response.message || 'Category not found');
        this.goBack();
        return;
      }

      const c = response.data;

      this.form.patchValue({
        code: c.code,
        name: c.name,
        description: c.description ?? '',
        isActive: c.isActive ?? true,
      });

      this.form.markAsPristine();
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load the category'));
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

    const request: CategoryRequest = {
      code: value.code.trim(),
      name: value.name.trim(),
      description: value.description.trim() || null,
      isActive: value.isActive,
    };

    this.isSaving.set(true);

    try {
      const response = this.isEdit()
        ? await firstValueFrom(this.service.update(this.categoryId(), request))
        : await firstValueFrom(this.service.create(request));

      if (!isOk(response)) {
        this.notify(failMessage(response, 'Save failed'));
        return;
      }

      this.notify(this.isEdit() ? 'Category updated successfully' : 'Category created successfully');

      this.form.markAsPristine();
      this.goBack();
    } catch (error) {
      // e.g. duplicate code
      this.notify(getApiMessage(error, 'Unable to save the category'));
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    void this.router.navigate(['/masters/categories']);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000 });
  }
}
