import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { ItemStock } from '../models/stock';

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/v1/Stock`;

  getAll(): Observable<ApiResponse<ItemStock[]>> {
    return this.http.get<ApiResponse<ItemStock[]>>(`${this.apiUrl}/GetAll`);
  }

  getByItem(itemmasterId: number): Observable<ApiResponse<ItemStock>> {
    return this.http.get<ApiResponse<ItemStock>>(
      `${this.apiUrl}/GetByItem/${itemmasterId}`,
    );
  }
}
