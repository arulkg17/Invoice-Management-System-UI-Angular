import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';
import { Customer, CustomerFilter, CustomerRequest } from '../models/customer';

/** All Customer endpoints: api/v1/Customer/... */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/v1/Customer`;

  getPaged(filter: CustomerFilter): Observable<ApiResponse<PagedResult<Customer>>> {
    let params = new HttpParams()
      .set('pageNumber', filter.pageNumber)
      .set('pageSize', filter.pageSize);

    if (filter.customerCode?.trim()) {
      params = params.set('customerCode', filter.customerCode.trim());
    }

    if (filter.customerName?.trim()) {
      params = params.set('customerName', filter.customerName.trim());
    }

    if (filter.city?.trim()) {
      params = params.set('city', filter.city.trim());
    }

    if (filter.isActive !== null) {
      params = params.set('isActive', filter.isActive);
    }

    return this.http.get<ApiResponse<PagedResult<Customer>>>(
      `${this.apiUrl}/GetAllPaged`,
      { params },
    );
  }

  getById(id: number): Observable<ApiResponse<Customer>> {
    return this.http.get<ApiResponse<Customer>>(`${this.apiUrl}/GetById/${id}`);
  }

  // Write calls return `unknown` because older controllers answer with a plain
  // true/false or a new id, newer ones with ApiResponse<T>. Screens use isOk().
  create(request: CustomerRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/Create`, request);
  }

  update(id: number, request: CustomerRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/Update/${id}`, { id, ...request });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/Delete/${id}`);
  }
}
