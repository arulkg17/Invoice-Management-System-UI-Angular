import { HttpErrorResponse } from '@angular/common/http';

/**
 * Returns the message the API sent (ApiResponse.message) so business rules such as
 * "Only Draft purchase orders can be edited." are shown to the user as they are.
 */
export function getApiMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;

    if (body && typeof body === 'object') {
      if (typeof body.message === 'string' && body.message) {
        return body.message;
      }

      if (typeof body.error?.details === 'string' && body.error.details) {
        return body.error.details;
      }
    }

    if (error.status === 0) {
      return 'Cannot reach the API. Is the backend running?';
    }

    if (error.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
  }

  return fallback;
}

/** Date -> "yyyy-MM-ddT00:00:00" (local date, no time-zone shift). */
export function toApiDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T00:00:00`;
}
