import { z } from 'zod';
import { validateCountryPhone } from '@/lib/utils/phoneValidation';
import { getTodayDateString } from '@/lib/utils/formValidation';

export const projectFormSchema = z
  .object({
    status: z.enum(['draft', 'created']),
    project_name: z
      .string()
      .trim()
      .min(1, 'Project name is required')
      .max(255),
    event_segment: z.string().trim().max(100).optional(),
    event_category: z.string().trim().max(100).optional(),
    event_subcategory: z.string().trim().max(100).optional(),
    project_description: z.string().trim().optional(),
    event_objective: z.string().trim().optional(),
    organiser_name: z.string().trim().max(255).optional(),
    designation: z.string().trim().max(100).optional(),
    official_email: z.string().trim().max(254).optional(),
    contact_number: z
      .string()
      .trim()
      .max(25)
      .optional()
      .superRefine((val, ctx) => {
        if (!val) return;
        const result = validateCountryPhone(val);
        if (!result.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: result.message || 'Please enter a valid contact phone number',
          });
        }
      }),
    organiser_country: z.string().trim().max(100).optional(),
    organiser_region: z.string().trim().max(100).optional(),
    event_country: z.string().trim().max(100).optional(),
    event_state: z.string().trim().max(100).optional(),
    event_city: z.string().trim().max(100).optional(),
    event_locality: z.string().trim().max(255).optional(),
    event_format: z.string().trim().max(50).optional(),
    proposed_date: z.string().trim().optional(),
    duration: z.string().trim().max(50).optional(),
    expected_attendance: z.union([z.number(), z.string()]).optional().nullable(),
    target_audience: z.string().trim().optional(),
    estimated_budget_range: z.string().trim().max(100).optional(),
    is_exact_budget: z.boolean().default(false),
    budget_min: z.union([z.number(), z.string()]).optional().nullable(),
    budget_max: z.union([z.number(), z.string()]).optional().nullable(),
    currency: z.string().trim().max(10).optional(),
    required_services: z.array(z.string()).optional(),
    research_objective: z.string().trim().optional(),
    research_start_date: z.string().trim().optional(),
    research_end_date: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'created') {
      if (!data.event_segment || data.event_segment.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Event segment is required', path: ['event_segment'] });
      }
      if (!data.event_category || data.event_category.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Event category is required', path: ['event_category'] });
      }
      if (!data.project_description || data.project_description.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Project description is required', path: ['project_description'] });
      }
      if (!data.event_objective || data.event_objective.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Event objective is required', path: ['event_objective'] });
      }
      if (!data.organiser_name || data.organiser_name.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Organiser name is required', path: ['organiser_name'] });
      }
      if (!data.official_email || data.official_email.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Official email is required', path: ['official_email'] });
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.official_email)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please enter a valid email address', path: ['official_email'] });
        }
      }
      if (!data.event_country || data.event_country.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Event country is required', path: ['event_country'] });
      }
      if (!data.event_city || data.event_city.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Event city is required', path: ['event_city'] });
      }
      if (!data.event_format || data.event_format.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Event format is required', path: ['event_format'] });
      }
      if (!data.research_objective || data.research_objective.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Research objective is required', path: ['research_objective'] });
      }
    }

    if (data.expected_attendance !== undefined && data.expected_attendance !== null && data.expected_attendance !== '') {
      const num = Number(data.expected_attendance);
      if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expected attendees must be a positive whole number',
          path: ['expected_attendance'],
        });
      }
    }

    const minRaw = data.budget_min !== undefined && data.budget_min !== null ? String(data.budget_min).trim() : '';
    const maxRaw = data.budget_max !== undefined && data.budget_max !== null ? String(data.budget_max).trim() : '';

    if (data.is_exact_budget) {
      if (minRaw !== '') {
        const minNum = Number(minRaw);
        if (isNaN(minNum) || minNum < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Budget amount must be a positive number',
            path: ['budget_min'],
          });
        }
      }
    } else {
      if (minRaw !== '' || maxRaw !== '') {
        if (minRaw === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Starting budget range is required',
            path: ['budget_min'],
          });
        } else {
          const minNum = Number(minRaw);
          if (isNaN(minNum) || minNum < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Starting budget must be a positive number',
              path: ['budget_min'],
            });
          }
        }

        if (maxRaw === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Ending budget range is required',
            path: ['budget_max'],
          });
        } else {
          const maxNum = Number(maxRaw);
          if (isNaN(maxNum) || maxNum < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Ending budget must be a positive number',
              path: ['budget_max'],
            });
          }
        }

        if (minRaw !== '' && maxRaw !== '') {
          const minNum = Number(minRaw);
          const maxNum = Number(maxRaw);
          if (!isNaN(minNum) && !isNaN(maxNum) && maxNum < minNum) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Ending budget must be greater than or equal to starting budget',
              path: ['budget_max'],
            });
          }
        }
      }
    }

    const todayStr = getTodayDateString();

    if (data.status === 'created' && data.proposed_date) {
      if (data.proposed_date < todayStr) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Proposed event date cannot be in the past',
          path: ['proposed_date'],
        });
      }
    }

    if (data.status === 'created' && data.research_start_date) {
      if (data.research_start_date < todayStr) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Research window start date cannot be in the past',
          path: ['research_start_date'],
        });
      }
    }

    if (data.research_start_date && data.research_end_date) {
      if (new Date(data.research_end_date) < new Date(data.research_start_date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Research end date must be on or after start date',
          path: ['research_end_date'],
        });
      }
    }
  });

export type ProjectFormData = z.input<typeof projectFormSchema>;
