import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';
import {
  SalesInvoice,
  SalesInvoiceFilter,
  SalesInvoiceRequest,
} from '../models/sales-invoice';

/** All Sales Invoice endpoints: api/v1/SalesInvoice/... */
@Injectable({ providedIn: 'root' })
export class SalesInvoiceService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/v1/SalesInvoice`;

  getPaged(
    filter: SalesInvoiceFilter,
  ): Observable<ApiResponse<PagedResult<SalesInvoice>>> {
    let params = new HttpParams()
      .set('pageNumber', filter.pageNumber)
      .set('pageSize', filter.pageSize);

    if (filter.invoiceNumber?.trim()) {
      params = params.set('invoiceNumber', filter.invoiceNumber.trim());
    }

    if (filter.customerId) {
      params = params.set('customerId', filter.customerId);
    }

    if (filter.status) {
      params = params.set('status', filter.status);
    }

    return this.http.get<ApiResponse<PagedResult<SalesInvoice>>>(
      `${this.apiUrl}/GetAllPaged`,
      { params },
    );
  }

  getById(id: number): Observable<ApiResponse<SalesInvoice>> {
    return this.http.get<ApiResponse<SalesInvoice>>(
      `${this.apiUrl}/GetById/${id}`,
    );
  }

  create(request: SalesInvoiceRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(`${this.apiUrl}/Create`, request);
  }

  update(
    id: number,
    request: SalesInvoiceRequest,
  ): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(
      `${this.apiUrl}/Update/${id}`,
      request,
    );
  }

  delete(id: number): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.apiUrl}/Delete/${id}`);
  }

  /** Draft -> Posted. The API checks the stock and answers 400 "Insufficient stock ..." when short. */
  post(id: number): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/Post/${id}`, {});
  }

  /** Draft/Posted -> Cancelled. A posted invoice gives its stock back. */
  cancel(id: number): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.apiUrl}/Cancel/${id}`,
      {},
    );
  }
}
