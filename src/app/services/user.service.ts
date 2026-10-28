import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';
import { User, UserFilter, UserRequest } from '../models/user';

/** All User endpoints: api/v1/User/... */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/v1/User`;

  getPaged(filter: UserFilter): Observable<ApiResponse<PagedResult<User>>> {
    let params = new HttpParams()
      .set('pageNumber', filter.pageNumber)
      .set('pageSize', filter.pageSize);

    if (filter.userName?.trim()) {
      params = params.set('userName', filter.userName.trim());
    }

    if (filter.email?.trim()) {
      params = params.set('email', filter.email.trim());
    }

    if (filter.city?.trim()) {
      params = params.set('city', filter.city.trim());
    }

    if (filter.isActive !== null) {
      params = params.set('isActive', filter.isActive);
    }

    return this.http.get<ApiResponse<PagedResult<User>>>(
      `${this.apiUrl}/GetAllPaged`,
      { params },
    );
  }

  getById(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/GetById/${id}`);
  }

  // Write calls return `unknown`: older controllers answer with true/false or a new id,
  // newer ones with ApiResponse<T>. Screens use isOk() from shared/api-result.ts.
  create(request: UserRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/Create`, request);
  }

  update(id: number, request: UserRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/Update/${id}`, { id, ...request });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/Delete/${id}`);
  }
}
