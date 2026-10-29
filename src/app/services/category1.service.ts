import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';
import { Category, CategoryFilter, CategoryRequest } from '../models/category';
import { CustomerRequest } from '../models/customer';

    /** All Category endpoints: api/v1/Category/... */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/v1/Category`;

  getPaged(filter: CategoryFilter): Observable<ApiResponse<PagedResult<Category>>> {
    let params = new HttpParams()
      .set('pageNumber', filter.pageNumber)
      .set('pageSize', filter.pageSize);

    if (filter.code?.trim()) {
      params = params.set('code', filter.code.trim());
    }

    if (filter.name?.trim()) {
      params = params.set('name', filter.name.trim());
    }

    if (filter.isActive !== null) {
      params = params.set('isActive', filter.isActive);
    }

    return this.http.get<ApiResponse<PagedResult<Category>>>(
      `${this.apiUrl}/GetAllPaged`,
      { params },
    );
  }

  getById(id: number): Observable<ApiResponse<Category>> {
    return this.http.get<ApiResponse<Category>>(`${this.apiUrl}/GetById/${id}`);
  }

  // Write calls return `unknown` because older controllers answer with a plain
  // true/false or a new id, newer ones with ApiResponse<T>. Screens use isOk().
  create(request: CategoryRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/Create`, request);
  }

  update(id: number, request: CategoryRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/Update/${id}`, { id, ...request });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/Delete/${id}`);
  }
}
