export interface Vendor {
  id: number;
  vendorCode: string;
  vendorName: string;
  city?: string | null;   // ASSUMED: remove if your Vendor DTO has no city/state
  state?: string | null;
  isActive?: boolean | null;
}

export interface VendorFilter {
  vendorCode: string;
  vendorName: string;
  city: string;
  isActive: boolean | null;
  pageNumber: number;
  pageSize: number;
}

export interface VendorRequest {
  vendorCode: string;
  vendorName: string;
  city: string | null;
  state: string | null;
  isActive: boolean;
}
