export interface SalesInvoiceDetail {
  id: number;
  salesInvoiceId: number;
  itemmasterId: number;
  quantity: number;
  rate: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
}

export interface SalesInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  customerId: number;
  status: string;
  notes?: string | null;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  createdBy?: string | null;
  createdDate?: string | null;
  updatedBy?: string | null;
  updatedDate?: string | null;
  details: SalesInvoiceDetail[];
}

export interface SalesInvoiceLineRequest {
  itemmasterId: number;
  quantity: number;
  rate: number;
  discountAmount: number;
  taxPercent: number;
}

export interface SalesInvoiceRequest {
  /** Leave empty/null to auto-generate (INV-000001). */
  invoiceNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  customerId: number;
  notes: string;
  details: SalesInvoiceLineRequest[];
}

export interface SalesInvoiceFilter {
  invoiceNumber?: string;
  customerId?: number | null;
  status?: string | null;
  pageNumber: number;
  pageSize: number;
}
