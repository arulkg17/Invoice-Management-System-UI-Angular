import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type AiMode = 'single' | 'multi';

/**
 * Calls the Invoice.AI endpoints exposed by Invoice.CoreAPI:
 *   POST api/invoice-ai/ask        (single intent)
 *   POST api/invoice-ai/ask-multi  (multiple intents in one question)
 *
 * ASSUMED request body: { question: string }. If your controller expects another
 * shape (for example { query: ... }), change it here, in this one place.
 */
@Injectable({ providedIn: 'root' })
export class InvoiceAiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiUrl}/invoice-ai`;

  ask(question: string, mode: AiMode): Observable<unknown> {
    const path = mode === 'multi' ? 'ask-multi' : 'ask';

    return this.http.post<unknown>(`${this.baseUrl}/${path}`, { question });
  }
}
