import { z } from 'zod';

export const projectFormSchema = z.object({
  status: z.enum(['draft', 'created']),
  project_name: z.string().min(1, 'Project name is required').max(255),
  event_segment: z.string().max(100).optional(),
  event_category: z.string().max(100).optional(),
  event_subcategory: z.string().max(100).optional(),
  project_description: z.string().optional(),
  event_objective: z.string().optional(),
  organiser_name: z.string().max(255).optional(),
  designation: z.string().max(100).optional(),
  official_email: z.string().max(254).optional(),
  contact_number: z.string().max(20).optional(),
  organiser_country: z.string().max(100).optional(),
  organiser_region: z.string().max(100).optional(),
  event_country: z.string().max(100).optional(),
  event_state: z.string().max(100).optional(),
  event_city: z.string().max(100).optional(),
  event_locality: z.string().max(255).optional(),
  event_format: z.string().max(50).optional(),
  proposed_date: z.string().optional(),
  duration: z.string().max(50).optional(),
  expected_attendance: z.union([z.number(), z.string()]).optional().nullable(),
  target_audience: z.string().optional(),
  estimated_budget_range: z.string().max(100).optional(),
  currency: z.string().max(10).optional(),
  required_services: z.array(z.string()).optional(),
  research_objective: z.string().optional(),
  research_start_date: z.string().optional(),
  research_end_date: z.string().optional(),
}).superRefine((data, ctx) => {
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

