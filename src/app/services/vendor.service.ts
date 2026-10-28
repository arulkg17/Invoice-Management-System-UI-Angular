import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';
import { Vendor, VendorFilter, VendorRequest } from '../models/vendor';

/** All Vendor endpoints: api/v1/Vendor/... */
@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/v1/Vendor`;

  getPaged(filter: VendorFilter): Observable<ApiResponse<PagedResult<Vendor>>> {
    let params = new HttpParams()
      .set('pageNumber', filter.pageNumber)
      .set('pageSize', filter.pageSize);

    if (filter.vendorCode?.trim()) {
      params = params.set('vendorCode', filter.vendorCode.trim());
    }

    if (filter.vendorName?.trim()) {
      params = params.set('vendorName', filter.vendorName.trim());
    }

    if (filter.city?.trim()) {
      params = params.set('city', filter.city.trim());
    }

    if (filter.isActive !== null) {
      params = params.set('isActive', filter.isActive);
    }

    return this.http.get<ApiResponse<PagedResult<Vendor>>>(
      `${this.apiUrl}/GetAllPaged`,
      { params },
    );
  }

  getById(id: number): Observable<ApiResponse<Vendor>> {
    return this.http.get<ApiResponse<Vendor>>(`${this.apiUrl}/GetById/${id}`);
  }

  // Write calls return `unknown` because older controllers answer with a plain
  // true/false or a new id, newer ones with ApiResponse<T>. Screens use isOk().
  create(request: VendorRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/Create`, request);
  }

  update(id: number, request: VendorRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/Update/${id}`, { id, ...request });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/Delete/${id}`);
  }
}
