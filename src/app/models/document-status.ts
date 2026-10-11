/** Receipt and Sales Invoice share the same workflow: Draft -> Posted -> Cancelled. */
export type DocStatus = 'Draft' | 'Posted' | 'Cancelled';

export const DOC_STATUSES: DocStatus[] = ['Draft', 'Posted', 'Cancelled'];
