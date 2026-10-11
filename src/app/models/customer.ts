export interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  isActive?: boolean | null;
}
