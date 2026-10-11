import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Customer, CustomerFilter } from '../models/customer';
import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1/Customer`;

  getAll(): Observable<ApiResponse<Customer[]>> {
    return this.http.get<ApiResponse<Customer[]>>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<ApiResponse<Customer>> {
    return this.http.get<ApiResponse<Customer>>(`${this.apiUrl}/GetById/${id}`);
  }

  getPaged(
    filter: CustomerFilter,
  ): Observable<ApiResponse<PagedResult<Customer>>> {
    const params = new HttpParams()
      .set('CustomerCode', filter.customerCode)
      .set('CustomerName', filter.customerName)
      .set('MobileNo', filter.mobileNo)
      .set('City', filter.city)
      .set('pageNumber', filter.pageNumber)
      .set('pageSize', filter.pageSize);

    return this.http.get<ApiResponse<PagedResult<Customer>>>(
      `${this.apiUrl}/GetAllPaged`,
      { params },
    );
  }

  create(customer: Customer): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${this.apiUrl}/Create`,
      customer,
    );
  }

  update(id: number, customer: Customer): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(
      `${this.apiUrl}/Update/${id}`,
      customer,
    );
  }

  delete(id: number): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.apiUrl}/Delete/${id}`);
  }
}
