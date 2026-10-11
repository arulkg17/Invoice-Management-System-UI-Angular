/** One row of the stock view: posted receipts minus posted sales invoices. */
export interface ItemStock {
  itemmasterId: number;
  itemCode: string;
  itemName: string;
  receivedQuantity: number;
  soldQuantity: number;
  onHandQuantity: number;
}
