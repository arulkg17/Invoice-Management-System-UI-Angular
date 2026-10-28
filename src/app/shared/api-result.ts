/**
 * Older controllers return a raw boolean / number, newer ones return ApiResponse<T>.
 * isOk() understands both, so the same screen code works with either style.
 */
export function isOk(result: unknown): boolean {
  if (typeof result === 'boolean') {
    return result;
  }

  if (result && typeof result === 'object' && 'success' in result) {
    return (result as { success: boolean }).success;
  }

  return true; // e.g. a numeric id was returned
}

export function failMessage(result: unknown, fallback: string): string {
  if (result && typeof result === 'object' && 'message' in result) {
    const message = (result as { message?: string }).message;

    if (message) {
      return message;
    }
  }

  return fallback;
}
