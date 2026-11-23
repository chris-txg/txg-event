import { bffFetch, BffResponse } from '@/lib/api/bff-client';
import { BFF_ENDPOINTS } from '@/config/endpoints';
import { User, AuthResponse } from '@/features/authentication/types/auth.types';
import { LoginFormData } from '@/features/authentication/schemas/login.schema';
import {
  B2CRegisterFormData,
  B2BRegisterFormData,
} from '@/features/authentication/schemas/customer-register.schema';
import { VendorRegisterFormData } from '@/features/authentication/schemas/vendor-register.schema';
import {
  ForgotPasswordFormData,
  ResetPasswordConfirmFormData,
  ChangePasswordFormData,
} from '@/features/authentication/schemas/password.schema';

export const authClientService = {
  async login(payload: LoginFormData): Promise<BffResponse<AuthResponse>> {
    return bffFetch<AuthResponse>(BFF_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async registerB2C(data: B2CRegisterFormData): Promise<BffResponse<AuthResponse>> {
    const { email, username, first_name, last_name, phone, password, password_confirm, city } = data;
    const payload = {
      email,
      username,
      first_name,
      last_name,
      phone: phone || null,
      password,
      password_confirm,
      user_type: 'CUSTOMER',
      customer_profile: {
        customer_type: 'B2C',
        ...(city ? { city } : {}),
      },
    };
    return bffFetch<AuthResponse>(BFF_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async registerB2B(data: B2BRegisterFormData): Promise<BffResponse<AuthResponse>> {
    const {
      email,
      username,
      first_name,
      last_name,
      phone,
      password,
      password_confirm,
      company_name,
      gst_number,
      city,
    } = data;
    const payload = {
      email,
      username,
      first_name,
      last_name,
      phone: phone || null,
      password,
      password_confirm,
      user_type: 'CUSTOMER',
      customer_profile: {
        customer_type: 'B2B',
        company_name,
        gst_number,
        ...(city ? { city } : {}),
      },
    };
    return bffFetch<AuthResponse>(BFF_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async registerVendor(data: VendorRegisterFormData): Promise<BffResponse<AuthResponse>> {
    const {
      email,
      username,
      first_name,
      last_name,
      phone,
      password,
      password_confirm,
      business_name,
      business_category,
      city,
    } = data;
    const payload = {
      email,
      username,
      first_name,
      last_name,
      phone: phone || null,
      password,
      password_confirm,
      user_type: 'VENDOR',
      vendor_profile: {
        business_name,
        business_category,
        city,
      },
    };
    return bffFetch<AuthResponse>(BFF_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<BffResponse<{ message: string }>> {
    return bffFetch<{ message: string }>(BFF_ENDPOINTS.AUTH.LOGOUT, {
      method: 'POST',
    });
  },

  async getMe(): Promise<BffResponse<{ user: User }>> {
    return bffFetch<{ user: User }>(BFF_ENDPOINTS.AUTH.ME, {
      method: 'GET',
    });
  },

  async updateMe(payload: Partial<User>): Promise<BffResponse<{ user: User }>> {
    return bffFetch<{ user: User }>(BFF_ENDPOINTS.AUTH.ME, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async forgotPassword(payload: ForgotPasswordFormData): Promise<BffResponse<{ message: string }>> {
    return bffFetch<{ message: string }>(BFF_ENDPOINTS.AUTH.PASSWORD_RESET, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(payload: ResetPasswordConfirmFormData): Promise<BffResponse<{ message: string }>> {
    return bffFetch<{ message: string }>(BFF_ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: ChangePasswordFormData): Promise<BffResponse<{ message: string }>> {
    return bffFetch<{ message: string }>(BFF_ENDPOINTS.AUTH.PASSWORD_CHANGE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
