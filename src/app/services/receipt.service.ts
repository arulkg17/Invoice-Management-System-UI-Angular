import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';
import { Receipt, ReceiptFilter, ReceiptRequest } from '../models/receipt';

/** All Receipt (goods receipt) endpoints: api/v1/Receipt/... */
@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/v1/Receipt`;

  getPaged(
    filter: ReceiptFilter,
  ): Observable<ApiResponse<PagedResult<Receipt>>> {
    let params = new HttpParams()
      .set('pageNumber', filter.pageNumber)
      .set('pageSize', filter.pageSize);

    if (filter.receiptNumber?.trim()) {
      params = params.set('receiptNumber', filter.receiptNumber.trim());
    }

    if (filter.purchaseOrderId) {
      params = params.set('purchaseOrderId', filter.purchaseOrderId);
    }

    if (filter.vendorId) {
      params = params.set('vendorId', filter.vendorId);
    }

    if (filter.status) {
      params = params.set('status', filter.status);
    }

    return this.http.get<ApiResponse<PagedResult<Receipt>>>(
      `${this.apiUrl}/GetAllPaged`,
      { params },
    );
  }

  getById(id: number): Observable<ApiResponse<Receipt>> {
    return this.http.get<ApiResponse<Receipt>>(`${this.apiUrl}/GetById/${id}`);
  }

  /** Returns the new receipt id in data. A new receipt is always Draft. */
  create(request: ReceiptRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(`${this.apiUrl}/Create`, request);
  }

  /** Only Draft receipts can be updated. */
  update(id: number, request: ReceiptRequest): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(
      `${this.apiUrl}/Update/${id}`,
      request,
    );
  }

  /** Only Draft receipts can be deleted. */
  delete(id: number): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.apiUrl}/Delete/${id}`);
  }

  /** Draft -> Posted: updates the PO received quantities, the PO status and the stock. */
  post(id: number): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/Post/${id}`, {});
  }

  /** Draft/Posted -> Cancelled (blocked when the received stock was already sold). */
  cancel(id: number): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.apiUrl}/Cancel/${id}`,
      {},
    );
  }
}
