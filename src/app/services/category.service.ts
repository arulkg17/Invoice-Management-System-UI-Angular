import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Category } from '../models/category';
import { CategoryFilter } from '../models/category-filter';
import { PagedResult } from '../models/paged-result';
import { ApiResponse } from '../models/api-response';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/v1/Category`;

  getPagedCategories(
    filter: CategoryFilter,
  ): Observable<ApiResponse<PagedResult<Category>>> {
    const params = new HttpParams()
      .set('code', filter.code || '')
      .set('name', filter.name || '')
      .set('pageNumber', filter.pageNumber)
      .set('pageSize', filter.pageSize);

    return this.http.get<ApiResponse<PagedResult<Category>>>(
      `${this.apiUrl}/GetAllPaged`,
      { params },
    );
  }

  getAll(): Observable<ApiResponse<Category[]>> {
    return this.http.get<ApiResponse<Category[]>>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<ApiResponse<Category>> {
    return this.http.get<ApiResponse<Category>>(`${this.apiUrl}/GetById/${id}`);
  }

  create(category: Category): Observable<ApiResponse<Category>> {
    return this.http.post<ApiResponse<Category>>(
      `${this.apiUrl}/create`,
      category,
    );
  }

  update(id: number, category: Category): Observable<boolean> {
    return this.http.put<boolean>(`${this.apiUrl}/update/${id}`, category);
  }
}
