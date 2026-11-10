export type UserRole = 'ADMIN' | 'CUSTOMER' | 'VENDOR';

export type CustomerType = 'B2C' | 'B2B';

export type VendorCategory =
  | 'VENUE'
  | 'CATERING'
  | 'PHOTOGRAPHY'
  | 'AUDIO_VISUAL'
  | 'DECORATION'
  | 'SECURITY'
  | 'ENTERTAINMENT'
  | 'TRANSPORT'
  | 'OTHER';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface CustomerProfile {
  id: string;
  user: string;
  customer_type: CustomerType;
  company_name?: string | null;
  gst_number?: string | null;
  city?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorProfile {
  id: string;
  user: string;
  business_name: string;
  business_category: VendorCategory;
  city: string;
  verification_status: VerificationStatus;
  rating?: string | number;
  total_reviews?: number;
  is_available?: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  user_type: UserRole;
  phone?: string | null;
  is_verified: boolean;
  customer_profile?: CustomerProfile | null;
  vendor_profile?: VendorProfile | null;
  created_at?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  user: User;
  tokens?: AuthTokens;
  message?: string;
}

export interface SessionData {
  user: User | null;
  isAuthenticated: boolean;
}

export interface ApiErrorResponse {
  detail?: string;
  error?: string;
  errors?: Record<string, string[] | string>;
  [key: string]: unknown;
}
