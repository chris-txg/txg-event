import { z } from 'zod';

/**
 * Reusable ISO date string validator that accepts null, undefined, or valid date string.
 */
const optionalIsoDateTime = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val || val === '') return true;
      return !isNaN(Date.parse(val));
    },
    { message: 'Please enter a valid date and time' }
  )
  .nullable()
  .optional();

// =================================================================
// 1. Survey Metadata Creation Schema
// Corresponds to SurveyCreateUpdateSerializer (serializers.py:144-181)
// =================================================================

export const createSurveySchema = z
  .object({
    /**
     * Mandatory EventProject association.
     * Enforced by PrimaryKeyRelatedField(queryset=EventProject.objects.all(), required=True)
     */
    project: z.string().uuid('Please select a valid Event Project'),
    title: z
      .string()
      .trim()
      .min(3, 'Survey title must be at least 3 characters')
      .max(255, 'Survey title cannot exceed 255 characters'),
    description: z
      .string()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional()
      .default(''),
    visibility: z.enum(['public', 'private']),
    allow_anonymous: z.boolean(),
    duplicate_rule: z.enum(['allow_multiple', 'one_per_user', 'one_per_ip']),
    start_date: optionalIsoDateTime,
    end_date: optionalIsoDateTime,
  })
  .superRefine((data, ctx) => {
    if (data.start_date) {
      const startTime = new Date(data.start_date).getTime();
      // Allow 2-minute buffer for form fill time
      if (!isNaN(startTime) && startTime < Date.now() - 120 * 1000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start date and time cannot be in the past',
          path: ['start_date'],
        });
      }
    }

    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date).getTime();
      const end = new Date(data.end_date).getTime();
      if (!isNaN(start) && !isNaN(end) && end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date cannot be earlier than start date',
          path: ['end_date'],
        });
      }
    }
  });

export type CreateSurveyFormValues = z.infer<typeof createSurveySchema>;

// =================================================================
// 2. Survey Metadata Update Schema
// Partial updates handled by SurveyDetailView.patch() (views.py:165)
// =================================================================

export const updateSurveySchema = z
  .object({
    project: z.string().uuid('Please select a valid Event Project').optional(),
    title: z
      .string()
      .trim()
      .min(3, 'Survey title must be at least 3 characters')
      .max(255, 'Survey title cannot exceed 255 characters')
      .optional(),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
    status: z.enum(['draft', 'published', 'closed']).optional(),
    visibility: z.enum(['public', 'private']).optional(),
    allow_anonymous: z.boolean().optional(),
    duplicate_rule: z.enum(['allow_multiple', 'one_per_user', 'one_per_ip']).optional(),
    start_date: optionalIsoDateTime,
    end_date: optionalIsoDateTime,
  })
  .superRefine((data, ctx) => {
    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date).getTime();
      const end = new Date(data.end_date).getTime();
      if (!isNaN(start) && !isNaN(end) && end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date cannot be earlier than start date',
          path: ['end_date'],
        });
      }
    }
  });

export type UpdateSurveyFormValues = z.infer<typeof updateSurveySchema>;

// =================================================================
// 3. Question Creation Schema
// Corresponds to QuestionCreateSerializer (serializers.py:37-72)
// =================================================================

export const createQuestionSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(2, 'Question text must be at least 2 characters')
      .max(500, 'Question text cannot exceed 500 characters'),
    question_type: z.enum(['text', 'number', 'single', 'multiple', 'boolean', 'date']),
    is_required: z.boolean(),
    order: z.number().int('Order must be an integer').min(0, 'Order cannot be negative'),
    choices: z.array(z.string().trim().min(1, 'Choice text cannot be empty')).optional(),
  })
  .superRefine((data, ctx) => {
    if (['single', 'multiple'].includes(data.question_type)) {
      if (!data.choices || data.choices.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Single and multiple choice questions require at least 2 options',
          path: ['choices'],
        });
      } else {
        const lowerChoices = data.choices.map((c) => c.toLowerCase());
        const hasDuplicates = new Set(lowerChoices).size !== lowerChoices.length;
        if (hasDuplicates) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Choice options must be unique (no duplicate choices allowed)',
            path: ['choices'],
          });
        }
      }
    }
  });

export type CreateQuestionFormValues = z.infer<typeof createQuestionSchema>;

// =================================================================
// 4. Question Update Schema
// Partial updates handled by QuestionDetailView.patch() (views.py:375)
// Note: question_type is excluded to prevent data corruption.
// =================================================================

export const updateQuestionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(2, 'Question text must be at least 2 characters')
    .max(500, 'Question text cannot exceed 500 characters')
    .optional(),
  is_required: z.boolean().optional(),
  order: z.number().int('Order must be an integer').min(0, 'Order cannot be negative').optional(),
});

export type UpdateQuestionFormValues = z.infer<typeof updateQuestionSchema>;
