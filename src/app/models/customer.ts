export interface Customer {
id: number;
customerCode: string;
customerName: string;
contactPerson?: string | null;
mobileNo?: string | null;
email?: string | null;
address1?: string | null;
address2?: string | null;
city?: string | null;
state?: string | null;
country?: string | null;
zipCode?: string | null;
gstNo?: string | null;
isActive?: boolean | null;
isDeleted?: boolean | null;
createdBy?: string | null;
createdDate?: string | null;
updatedBy?: string | null;
updatedDate?: string | null;
}

export interface CustomerFilter {
customerCode: string;
customerName: string;
mobileNo: string;
city: string;
pageNumber: number;
pageSize: number;
}
