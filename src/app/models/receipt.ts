export interface ReceiptDetail {
  id: number;
  receiptId: number;
  purchaseOrderDetailId: number;
  itemmasterId: number;
  receivedQuantity: number;
  rate: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Receipt {
  id: number;
  receiptNumber: string;
  receiptDate: string;
  purchaseOrderId: number;
  vendorId: number;
  status: string;
  notes?: string | null;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  createdBy?: string | null;
  createdDate?: string | null;
  updatedBy?: string | null;
  updatedDate?: string | null;
  details: ReceiptDetail[];
}

/** Only the PO line and the quantity are sent. Item, rate and tax come from the PO line on the server. */
export interface ReceiptLineRequest {
  purchaseOrderDetailId: number;
  receivedQuantity: number;
}

export interface ReceiptRequest {
  /** Leave empty/null to auto-generate (GRN-000001). */
  receiptNumber: string | null;
  receiptDate: string;
  purchaseOrderId: number;
  notes: string;
  details: ReceiptLineRequest[];
}

export interface ReceiptFilter {
  receiptNumber?: string;
  purchaseOrderId?: number | null;
  vendorId?: number | null;
  status?: string | null;
  pageNumber: number;
  pageSize: number;
}
