import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
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

import { UserService } from '../../../services/user.service';
import { User, UserFilter } from '../../../models/user';
import { getApiMessage } from '../../../shared/api-helpers';
import { failMessage, isOk } from '../../../shared/api-result';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    DatePipe,
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
  templateUrl: './user-list.component.html',
  styleUrl: '../../../shared/master-page.css',
})
export class UserListComponent implements OnInit {
  private readonly service = inject(UserService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'userName',
    'displayName',
    'email',
    'phoneNumber',
    'city',
    'state',
    'lastLoginDate',
    'status',
    'actions',
  ];

  readonly users = signal<User[]>([]);
  readonly isLoading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  // SEARCH FILTERS
  readonly filterForm = this.fb.group({
    userName: [''],
    email: [''],
    city: [''],
    isActive: [null as boolean | null],
  });

  constructor() {
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

      const filter: UserFilter = {
        userName: value.userName ?? '',
        email: value.email ?? '',
        city: value.city ?? '',
        isActive: value.isActive,
        pageNumber: this.pageIndex() + 1,
        pageSize: this.pageSize(),
      };

      const response = await firstValueFrom(this.service.getPaged(filter));

      if (!response.success) {
        this.notify(response.message || 'Unable to load users');
        return;
      }

      this.users.set(response.data?.data ?? []);
      this.totalRecords.set(response.data?.totalRecords ?? 0);
    } catch (error) {
      this.notify(getApiMessage(error, 'Unable to load users'));
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilters(): void {
    this.filterForm.reset({ userName: '', email: '', city: '', isActive: null });
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    void this.load();
  }

  // ---------------- NAVIGATION ----------------
  add(): void {
    void this.router.navigate(['/masters/users/create']);
  }

  edit(u: User): void {
    void this.router.navigate(['/masters/users/edit', u.id]);
  }

  // ---------------- DELETE ----------------
  async remove(u: User): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, { width: '420px', data: { name: u.userName } })
        .afterClosed(),
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await firstValueFrom(this.service.delete(u.id));

      this.notify(
        isOk(response) ? `${u.userName} deleted` : failMessage(response, 'Delete failed'),
      );

      await this.load();
    } catch (error) {
      this.notify(getApiMessage(error, 'Delete failed'));
    }
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000 });
  }
}
