import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';   // was ../../../

export type PdfDocType = 'PurchaseOrder' | 'SalesInvoice' | 'Receipt';

@Injectable({ providedIn: 'root' })
export class PdfService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1`;          // added /v1

  getPdf(type: PdfDocType, id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${type}/${id}/pdf`, { responseType: 'blob' });
  }
}