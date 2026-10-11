import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { StockService } from '../../services/stock.service';
import { ItemStock } from '../../models/stock';
import { getApiMessage } from '../../shared/api-helpers';

/**
 * Stock on hand = posted receipts - posted sales invoices.
 * Post a receipt and the "On hand" goes up, post a sales invoice and it goes down.
 */
@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [
    DecimalPipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.css',
})
export class StockListComponent implements OnInit {
  private readonly service = inject(StockService);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayedColumns = [
    'itemCode',
    'itemName',
    'receivedQuantity',
    'soldQuantity',
    'onHandQuantity',
  ];

  readonly rows = signal<ItemStock[]>([]);
  readonly search = signal('');
  readonly isLoading = signal(false);

  /** Client-side search (the whole stock list is small) */
  readonly filtered = computed(() => {
    const text = this.search().trim().toLowerCase();

    if (!text) {
      return this.rows();
    }

    return this.rows().filter(
      (r) =>
        r.itemCode.toLowerCase().includes(text) ||
        r.itemName.toLowerCase().includes(text),
    );
  });

  ngOnInit(): Promise<void> {
    return this.load();
  }

  async load(): Promise<void> {
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(this.service.getAll());
      this.rows.set(response.data ?? []);
    } catch (error) {
      this.snackBar.open(getApiMessage(error, 'Unable to load stock'), 'Close', {
        duration: 5000,
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
