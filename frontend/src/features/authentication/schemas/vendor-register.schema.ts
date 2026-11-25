import { z } from 'zod';
import { validateCountryPhone } from '@/lib/utils/phoneValidation';

export const VENDOR_CATEGORIES = [
  { value: 'VENUE', label: 'Venue & Banquet' },
  { value: 'CATERING', label: 'Catering & Food' },
  { value: 'PHOTOGRAPHY', label: 'Photography & Videography' },
  { value: 'AUDIO_VISUAL', label: 'Audio / Visual & Lighting' },
  { value: 'DECORATION', label: 'Decoration & Florals' },
  { value: 'ENTERTAINMENT', label: 'Entertainment & Music' },
  { value: 'SECURITY', label: 'Security & Bouncers' },
  { value: 'TRANSPORT', label: 'Transport & Logistics' },
  { value: 'OTHER', label: 'Other Services' },
] as const;

export const vendorCategoryEnum = z.enum([
  'VENUE',
  'CATERING',
  'PHOTOGRAPHY',
  'AUDIO_VISUAL',
  'DECORATION',
  'SECURITY',
  'ENTERTAINMENT',
  'TRANSPORT',
  'OTHER',
]);

export const vendorRegisterSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Email address is required')
      .email('Please enter a valid email address')
      .toLowerCase(),
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(150, 'Username must be at most 150 characters')
      .regex(/^[\w.@+-]+$/, 'Letters, digits and @/./+/-/_ only'),
    first_name: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(150),
    last_name: z
      .string()
      .trim()
      .min(1, 'Last name is required')
      .max(150),
    phone: z
      .string()
      .trim()
      .optional()
      .superRefine((val, ctx) => {
        if (!val) return;
        const result = validateCountryPhone(val);
        if (!result.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: result.message || 'Please enter a valid phone number',
          });
        }
      }),
    business_name: z
      .string()
      .trim()
      .min(2, 'Business name is required (at least 2 characters)')
      .max(255),
    business_category: vendorCategoryEnum,
    city: z
      .string()
      .trim()
      .min(2, 'City is required (at least 2 characters)')
      .max(100),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: 'Passwords do not match',
    path: ['password_confirm'],
  });

export type VendorRegisterFormData = z.infer<typeof vendorRegisterSchema>;
