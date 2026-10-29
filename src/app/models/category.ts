export interface Category {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

export interface CategoryFilter {
  code: string;
  name: string;
  isActive: boolean | null;
  pageNumber: number;
  pageSize: number;
}

export interface CategoryRequest {
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}
