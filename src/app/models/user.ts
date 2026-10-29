export interface User {
  id: number;
  userName: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  phoneNumber: string;
  alternatePhone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  dateOfBirth: string | null;
  isActive: boolean;
  lastLoginDate: string | null;
}

export interface UserFilter {
  userName: string;
  email: string;
  city: string;
  isActive: boolean | null;
  pageNumber: number;
  pageSize: number;
}

/** What the create / update screens send (id is added by the service on update). */
export interface UserRequest {
  userName: string;
  email: string;
  password?: string; 
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  phoneNumber: string;
  alternatePhone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  dateOfBirth: string | null;
  isActive: boolean;
}
