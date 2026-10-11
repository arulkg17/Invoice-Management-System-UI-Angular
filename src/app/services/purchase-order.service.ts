import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';
import {
  PurchaseOrder,
  PurchaseOrderFilter,
  PurchaseOrderRequest,
} from '../models/purchase-order';

/** All Purchase Order endpoints: api/v1/PurchaseOrder/... */
@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/v1/PurchaseOrder`;

  /** GET GetAllPaged?PONumber=&VendorId=&Status=&pageNumber=&pageSize= */
  getPaged(
    filter: PurchaseOrderFilter,
  ): Observable<ApiResponse<PagedResult<PurchaseOrder>>> {
    let params = new HttpParams()
      .set('pageNumber', filter.pageNumber)
      .set('pageSize', filter.pageSize);

    // Only send the filters that have a value
    if (filter.poNumber?.trim()) {
      params = params.set('PONumber', filter.poNumber.trim());
    }

    if (filter.vendorId) {
      params = params.set('VendorId', filter.vendorId);
    }

    if (filter.status) {
      params = params.set('Status', filter.status);
    }

    return this.http.get<ApiResponse<PagedResult<PurchaseOrder>>>(
      `${this.apiUrl}/GetAllPaged`,
      { params },
    );
  }

  getAll(): Observable<ApiResponse<PurchaseOrder[]>> {
    return this.http.get<ApiResponse<PurchaseOrder[]>>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.get<ApiResponse<PurchaseOrder>>(
      `${this.apiUrl}/GetById/${id}`,
    );
  }

  /** Returns the new PO id in data. The PO always starts as Draft. */
  create(request: PurchaseOrderRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(`${this.apiUrl}/Create`, request);
  }

  /** Only Draft purchase orders can be updated (the API answers 400 otherwise). */
  update(
    id: number,
    request: PurchaseOrderRequest,
  ): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(
      `${this.apiUrl}/Update/${id}`,
      request,
    );
  }

  /** Only Draft or Cancelled purchase orders can be deleted. */
  delete(id: number): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.apiUrl}/Delete/${id}`);
  }

  /** Draft -> Approved */
  approve(id: number): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.apiUrl}/Approve/${id}`,
      {},
    );
  }

  /** Draft / Approved -> Cancelled (blocked while receipts exist) */
  cancel(id: number): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.apiUrl}/Cancel/${id}`,
      {},
    );
  }
}
