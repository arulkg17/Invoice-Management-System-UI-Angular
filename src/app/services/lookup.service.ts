import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { Vendor } from '../models/vendor';
import { Itemmaster } from '../models/itemmaster';

/** Dropdown data needed by the transaction screens (vendors, items). */
@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly http = inject(HttpClient);

  getVendors(): Observable<ApiResponse<Vendor[]>> {
    return this.http.get<ApiResponse<Vendor[]>>(
      `${environment.apiUrl}/v1/Vendor/GetAll`,
    );
  }

  getItems(): Observable<ApiResponse<Itemmaster[]>> {
    return this.http.get<ApiResponse<Itemmaster[]>>(
      `${environment.apiUrl}/v1/Itemmaster/GetAll`,
    );
  }
}
