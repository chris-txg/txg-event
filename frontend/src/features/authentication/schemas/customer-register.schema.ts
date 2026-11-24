import { z } from 'zod';

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const baseUserFields = {
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
    .refine((val) => !val || /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/.test(val), {
      message: 'Please enter a valid phone number (digits and optional +/spaces)',
    }),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  password_confirm: z.string().min(1, 'Please confirm your password'),
};

export const b2cRegisterSchema = z
  .object({
    ...baseUserFields,
    customer_type: z.literal('B2C'),
    city: z.string().trim().max(100).optional(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: 'Passwords do not match',
    path: ['password_confirm'],
  });

export const b2bRegisterSchema = z
  .object({
    ...baseUserFields,
    customer_type: z.literal('B2B'),
    company_name: z
      .string()
      .trim()
      .min(2, 'Company name is required (at least 2 characters)')
      .max(255),
    gst_number: z
      .string()
      .trim()
      .toUpperCase()
      .regex(GSTIN_REGEX, 'Enter a valid 15-character Indian GSTIN (e.g. 29ABCDE1234F1Z5)'),
    city: z.string().trim().max(100).optional(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: 'Passwords do not match',
    path: ['password_confirm'],
  });

export type B2CRegisterFormData = z.infer<typeof b2cRegisterSchema>;
export type B2BRegisterFormData = z.infer<typeof b2bRegisterSchema>;
