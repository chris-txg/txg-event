'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import {
  surveyClientService,
  type SurveyListFilters,
} from '@/features/surveys/services/surveyClientService';
import type {
  SurveyListItem,
  SurveyDetail,
  CreateSurveyPayload,
  UpdateSurveyPayload,
  PaginatedResponse,
  Question,
  QuestionChoice,
  CreateQuestionPayload,
  UpdateQuestionPayload,
  CreateChoicePayload,
  SurveySubmitPayload,
  SurveySubmitSuccessResponse,
  PublishSurveyResponse,
  CloseSurveyResponse,
  SurveyPaymentOrderResponse,
  SurveyPaymentVerifyPayload,
  SurveyPaymentVerifyResponse,
} from '@/features/surveys/types/survey.types';

// =================================================================
// 1. Typed API Error Handling
// =================================================================

/**
 * Custom error class preserving HTTP status and original error payload
 * for robust form inspection and UI toast/alert messaging.
 */
export class SurveyApiError extends Error {
  public readonly status: number;
  public readonly originalError: unknown;

  constructor(message: string, status: number, originalError: unknown) {
    super(message);
    this.name = 'SurveyApiError';
    this.status = status;
    this.originalError = originalError;
    Object.setPrototypeOf(this, SurveyApiError.prototype);
  }
}

/**
 * Extracts human-readable messages from standard Django REST Framework
 * response bodies while preserving the raw error object on SurveyApiError.
 */
export function parseSurveyApiError(
  error: unknown,
  status: number,
  fallbackMessage: string
): SurveyApiError {
  let message = fallbackMessage;

  if (typeof error === 'string' && error.trim().length > 0) {
    message = error;
  } else if (Array.isArray(error) && error.length > 0) {
    message = error.map(String).join(' ');
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;

    if (typeof errObj.detail === 'string' && errObj.detail.trim().length > 0) {
      message = errObj.detail;
    } else if (Array.isArray(errObj.non_field_errors) && errObj.non_field_errors.length > 0) {
      message = errObj.non_field_errors.map(String).join(' ');
    } else {
      const fieldEntries = Object.entries(errObj).filter(
        ([, val]) => typeof val === 'string' || Array.isArray(val)
      );

      if (fieldEntries.length > 0) {
        message = fieldEntries
          .map(([field, val]) => {
            const valStr = Array.isArray(val) ? val.map(String).join(', ') : String(val);
            return `${field}: ${valStr}`;
          })
          .join(' | ');
      }
    }
  }

  return new SurveyApiError(message, status, error);
}

// =================================================================
// 2. Hierarchical Query Key Factory
// =================================================================

/**
 * Centralized query key factory for surveys, enabling precise prefix-based
 * cache invalidation across lists, project-specific views, individual details,
 * and respondent public queries.
 */
export const surveyKeys = {
  all: ['surveys'] as const,
  lists: () => [...surveyKeys.all, 'list'] as const,
  list: (filters?: SurveyListFilters) => [...surveyKeys.lists(), filters ?? {}] as const,
  projectLists: () => [...surveyKeys.all, 'project'] as const,
  projectList: (projectId: string, page = 1, pageSize = 20) =>
    [...surveyKeys.projectLists(), projectId, { page, pageSize }] as const,
  details: () => [...surveyKeys.all, 'detail'] as const,
  detail: (surveyId: string) => [...surveyKeys.details(), surveyId] as const,
  publics: () => [...surveyKeys.all, 'public'] as const,
  public: (surveyId: string, isAuthenticated: boolean) =>
    [...surveyKeys.publics(), surveyId, isAuthenticated] as const,
};

// =================================================================
// 3. Query Hooks
// =================================================================

/**
 * Fetches all surveys authored by the authenticated organiser across projects.
 * Query key: ['surveys', 'list', filters]
 */
export function useSurveys<TData = PaginatedResponse<SurveyListItem>>(
  filters?: SurveyListFilters,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<SurveyListItem>, SurveyApiError, TData>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    ...options,
    queryKey: surveyKeys.list(filters),
    queryFn: async () => {
      const res = await surveyClientService.getSurveys(filters);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to fetch surveys.');
      }
      return res.data;
    },
  });
}

/**
 * Fetches surveys scoped to a specific EventProject workspace tab.
 * Query key: ['surveys', 'project', projectId, { page, pageSize }]
 * Guarded against execution when projectId is empty or missing.
 */
export function useProjectSurveys<TData = PaginatedResponse<SurveyListItem>>(
  projectId: string,
  page = 1,
  pageSize = 20,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<SurveyListItem>, SurveyApiError, TData>,
    'queryKey' | 'queryFn'
  >
) {
  const isEnabled = Boolean(projectId && projectId.trim().length > 0) && (options?.enabled ?? true);

  return useQuery({
    ...options,
    queryKey: surveyKeys.projectList(projectId, page, pageSize),
    queryFn: async () => {
      const res = await surveyClientService.getProjectSurveys(projectId, page, pageSize);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to fetch project surveys.');
      }
      return res.data;
    },
    enabled: isEnabled,
  });
}

/**
 * Fetches full survey detail including nested questions & choices.
 * Query key: ['surveys', 'detail', surveyId]
 * Guarded against execution when surveyId is empty or missing.
 */
export function useSurvey<TData = SurveyDetail>(
  surveyId: string,
  options?: Omit<
    UseQueryOptions<SurveyDetail, SurveyApiError, TData>,
    'queryKey' | 'queryFn'
  >
) {
  const isEnabled = Boolean(surveyId && surveyId.trim().length > 0) && (options?.enabled ?? true);

  return useQuery({
    ...options,
    queryKey: surveyKeys.detail(surveyId),
    queryFn: async () => {
      const res = await surveyClientService.getSurveyById(surveyId);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to fetch survey details.');
      }
      return res.data;
    },
    enabled: isEnabled,
  });
}

// =================================================================
// 4. Mutation Hooks
// =================================================================

/**
 * Creates a new draft survey associated with an owned project.
 * Automatically primes the survey detail cache and invalidates list caches.
 */
export function useCreateSurvey(
  options?: UseMutationOptions<SurveyDetail, SurveyApiError, CreateSurveyPayload>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async (payload: CreateSurveyPayload) => {
      const res = await surveyClientService.createSurvey(payload);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to create survey.');
      }
      return res.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      // 1. Prime the survey detail cache with the newly created survey
      queryClient.setQueryData(surveyKeys.detail(data.id), data);

      // 2. Invalidate global organiser survey lists
      await queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });

      // 3. Invalidate project-specific survey lists
      await queryClient.invalidateQueries({ queryKey: surveyKeys.projectLists() });

      // 4. Forward to caller-provided onSuccess callback
      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
  });
}

export interface UpdateSurveyVariables {
  surveyId: string;
  payload: UpdateSurveyPayload;
}

/**
 * Updates metadata for an existing survey.
 * Updates the survey detail cache without redundant immediate refetching,
 * and invalidates survey lists to reflect title/status/date changes.
 */
export function useUpdateSurvey(
  options?: UseMutationOptions<SurveyDetail, SurveyApiError, UpdateSurveyVariables>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async ({ surveyId, payload }: UpdateSurveyVariables) => {
      const res = await surveyClientService.updateSurvey(surveyId, payload);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to update survey.');
      }
      return res.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      // 1. Update the detail cache directly with the fresh response
      queryClient.setQueryData(surveyKeys.detail(data.id), data);

      // 2. Invalidate lists so updated title/status/dates reflect across tables
      await queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: surveyKeys.projectLists() });

      // 3. Forward to caller-provided onSuccess callback
      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
  });
}

export interface DeleteSurveyVariables {
  surveyId: string;
  projectId?: string;
}

/**
 * Deletes a draft survey.
 * Handles HTTP 204 No Content responses cleanly.
 * Evicts the survey detail cache and invalidates survey lists.
 */
export function useDeleteSurvey(
  options?: UseMutationOptions<void, SurveyApiError, DeleteSurveyVariables>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async ({ surveyId }: DeleteSurveyVariables) => {
      const res = await surveyClientService.deleteSurvey(surveyId);
      if (!res.ok) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to delete survey.');
      }
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      // 1. Evict the deleted survey from the detail cache
      queryClient.removeQueries({ queryKey: surveyKeys.detail(variables.surveyId) });

      // 2. Invalidate global organiser survey lists
      await queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });

      // 3. Invalidate project-specific survey lists
      await queryClient.invalidateQueries({ queryKey: surveyKeys.projectLists() });

      // 4. Forward to caller-provided onSuccess callback
      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
  });
}

// =================================================================
// 6. Question & Choice Mutation Hooks
// =================================================================

export interface UpdateQuestionVariables {
  questionId: string;
  payload: UpdateQuestionPayload;
}

export interface DeleteQuestionVariables {
  questionId: string;
}

export interface AddChoiceVariables {
  questionId: string;
  payload: CreateChoicePayload;
}

export interface DeleteChoiceVariables {
  choiceId: string;
}

/**
 * Adds a question to the specified survey and invalidates survey detail query cache.
 */
export function useAddQuestion(
  surveyId: string,
  options?: UseMutationOptions<Question, SurveyApiError, CreateQuestionPayload>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async (payload: CreateQuestionPayload) => {
      const res = await surveyClientService.addQuestion(surveyId, payload);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to add question.');
      }
      return res.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) });
      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
  });
}

/**
 * Updates question properties (text, is_required, order) and invalidates survey detail query cache.
 */
export function useUpdateQuestion(
  surveyId: string,
  options?: UseMutationOptions<Question, SurveyApiError, UpdateQuestionVariables>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async ({ questionId, payload }: UpdateQuestionVariables) => {
      const res = await surveyClientService.updateQuestion(questionId, payload);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to update question.');
      }
      return res.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) });
      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
  });
}

/**
 * Deletes a question and its choices, and invalidates survey detail query cache.
 */
export function useDeleteQuestion(
  surveyId: string,
  options?: UseMutationOptions<void, SurveyApiError, DeleteQuestionVariables>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async ({ questionId }: DeleteQuestionVariables) => {
      const res = await surveyClientService.deleteQuestion(questionId);
      if (!res.ok) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to delete question.');
      }
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) });
      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
  });
}

/**
 * Adds a new choice to an existing single/multiple choice question and invalidates survey detail query cache.
 */
export function useAddChoice(
  surveyId: string,
  options?: UseMutationOptions<QuestionChoice, SurveyApiError, AddChoiceVariables>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async ({ questionId, payload }: AddChoiceVariables) => {
      const res = await surveyClientService.addChoice(questionId, payload);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to add choice.');
      }
      return res.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) });
      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
  });
}

/**
 * Deletes a choice option from a question and invalidates survey detail query cache.
 */
export function useDeleteChoice(
  surveyId: string,
  options?: UseMutationOptions<void, SurveyApiError, DeleteChoiceVariables>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async ({ choiceId }: DeleteChoiceVariables) => {
      const res = await surveyClientService.deleteChoice(choiceId);
      if (!res.ok) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to delete choice.');
      }
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) });
      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
  });
}

export interface SwapQuestionsVariables {
  questionA: Question;
  questionB: Question;
  indexA: number;
  indexB: number;
  allQuestions: Question[];
}

/**
 * Executes a dedicated failure-safe three-step reordering swap between two questions:
 * 1. PATCH A with order: temporaryOrder (strictly > max(all current orders), verified unused)
 * 2. PATCH B with order: orderA
 * 3. PATCH A with order: orderB
 *
 * Requirements:
 * - Awaits each request before starting the next.
 * - Guarantees no duplicate order values during the operation.
 * - Does not trigger intermediate survey detail invalidations after individual steps.
 * - Refetches survey detail on complete success or any failure to ensure UI synchronization.
 */
export function useSwapQuestions(
  surveyId: string,
  options?: UseMutationOptions<void, SurveyApiError, SwapQuestionsVariables>
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async ({
      questionA,
      questionB,
      indexA,
      indexB,
      allQuestions,
    }: SwapQuestionsVariables) => {
      const N = allQuestions.length;

      // 1. Strict validation of indices and matching question objects
      if (
        !Number.isInteger(indexA) ||
        !Number.isInteger(indexB) ||
        indexA < 0 ||
        indexA >= N ||
        indexB < 0 ||
        indexB >= N ||
        indexA === indexB
      ) {
        throw new SurveyApiError(
          'Reorder failed: invalid or non-distinct question swap indices provided.',
          400,
          { detail: 'Invalid or non-distinct question swap indices provided.' }
        );
      }

      if (
        allQuestions[indexA]?.id !== questionA.id ||
        allQuestions[indexB]?.id !== questionB.id
      ) {
        throw new SurveyApiError(
          'Reorder failed: question objects at specified positions do not match expected swap targets.',
          400,
          { detail: 'Questions at indices do not match questionA and questionB.' }
        );
      }

      // 2. Reliable duplicate order check across the entire allQuestions array
      const existingOrders = allQuestions.map((q) => q.order ?? 0);
      const hasDuplicateOrders = new Set(existingOrders).size !== existingOrders.length;

      // =================================================================
      // Case A: All order values across the survey are strictly unique
      // Safe three-step temporary-order swap between questionA and questionB
      // =================================================================
      if (!hasDuplicateOrders) {
        const orderA = questionA.order ?? 0;
        const orderB = questionB.order ?? 0;

        // Calculate an unused temporary order strictly greater than every current question's order
        const maxOrder = allQuestions.reduce((max, q) => Math.max(max, q.order ?? 0), 0);
        const temporaryOrder = Math.max(maxOrder, N) + 1000;

        // Step 1: PATCH A with order: temporaryOrder
        const res1 = await surveyClientService.updateQuestion(questionA.id, {
          order: temporaryOrder,
        });
        if (!res1.ok) {
          throw parseSurveyApiError(
            res1.error,
            res1.status,
            'Reorder step 1 failed: could not set temporary order.'
          );
        }

        // Step 2: PATCH B with order: orderA
        const res2 = await surveyClientService.updateQuestion(questionB.id, {
          order: orderA,
        });
        if (!res2.ok) {
          throw parseSurveyApiError(
            res2.error,
            res2.status,
            'Reorder step 2 failed: could not update swap question order. Saved order may be partially updated; server state synchronized.'
          );
        }

        // Step 3: PATCH A with order: orderB
        const res3 = await surveyClientService.updateQuestion(questionA.id, {
          order: orderB,
        });
        if (!res3.ok) {
          throw parseSurveyApiError(
            res3.error,
            res3.status,
            'Reorder step 3 failed: could not assign final target order. Saved order may be partially updated; server state synchronized.'
          );
        }

        return;
      }

      // =================================================================
      // Case B: Duplicate order values exist anywhere in allQuestions
      // Full two-phase normalization algorithm to eliminate all duplicates
      // and prevent collisions with any third-party questions.
      // 1. Copy allQuestions in its current display order.
      // 2. Swap A and B in the desired array.
      // 3. Compute maxOrder across all existing questions.
      // 4. Assign each question a unique temporary order greater than maxOrder,
      //    sequentially, awaiting each PATCH.
      // 5. Once all original values are vacated, assign final normalized orders
      //    0 through N - 1, sequentially, awaiting each PATCH.
      // =================================================================
      const desiredOrder = [...allQuestions];
      const temp = desiredOrder[indexA];
      desiredOrder[indexA] = desiredOrder[indexB];
      desiredOrder[indexB] = temp;

      const maxOrder = allQuestions.reduce((max, q) => Math.max(max, q.order ?? 0), 0);
      const baseTempOrder = Math.max(maxOrder, N) + 1000;

      // Phase 1: Assign each question a unique temporary order > maxOrder to vacate all original orders
      for (let i = 0; i < N; i++) {
        const q = desiredOrder[i];
        const uniqueTempOrder = baseTempOrder + i;
        const resTemp = await surveyClientService.updateQuestion(q.id, {
          order: uniqueTempOrder,
        });
        if (!resTemp.ok) {
          throw parseSurveyApiError(
            resTemp.error,
            resTemp.status,
            `Duplicate-order normalization failed at temporary step ${i + 1}/${N}: could not vacate question order. Saved order may be partially updated; server state synchronized.`
          );
        }
      }

      // Phase 2: Once all original order values are vacated, assign final normalized orders 0 through N - 1
      for (let i = 0; i < N; i++) {
        const q = desiredOrder[i];
        const finalOrder = i;
        const resFinal = await surveyClientService.updateQuestion(q.id, {
          order: finalOrder,
        });
        if (!resFinal.ok) {
          throw parseSurveyApiError(
            resFinal.error,
            resFinal.status,
            `Duplicate-order normalization failed at final step ${i + 1}/${N}: could not assign normalized order. Saved order may be partially updated; server state synchronized.`
          );
        }
      }
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) });
      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
    onError: async (error, variables, onMutateResult, context) => {
      // Invalidate detail query on failure so client state synchronizes with actual database state
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) });
      if (onError) {
        await onError(error, variables, onMutateResult, context);
      }
    },
  });
}

// =================================================================
// 7. Respondent Survey Hooks (Public Participation)
// =================================================================

/**
 * Fetches public survey detail for respondent participation.
 * Query key: ['surveys', 'public', cleanId, isAuthenticated]
 *
 * Cache behavior:
 * Distinct from organiser detail cache. Normalizes surveyId via trim() so that
 * whitespace-padded IDs and clean IDs share the exact same cache entry.
 * Includes isAuthenticated in the query key so anonymous 403 errors are not
 * cached/reused when a user logs in.
 *
 * Guarded against execution when cleanId is empty.
 */
export function usePublicSurvey<TData = SurveyDetail>(
  surveyId: string,
  isAuthenticated: boolean,
  options?: Omit<
    UseQueryOptions<SurveyDetail, SurveyApiError, TData>,
    'queryKey' | 'queryFn'
  >
) {
  const cleanId = typeof surveyId === 'string' ? surveyId.trim() : '';
  const isEnabled = cleanId.length > 0 && (options?.enabled ?? true);

  return useQuery({
    ...options,
    queryKey: surveyKeys.public(cleanId, isAuthenticated),
    queryFn: async () => {
      const res = await surveyClientService.getPublicSurvey(cleanId);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to fetch public survey.');
      }
      return res.data;
    },
    enabled: isEnabled,
  });
}

/**
 * Submits respondent answers to an active survey.
 *
 * Mutation requirements:
 * - retry: false is strictly enforced after consumer options spread to guarantee
 *   retries cannot be re-enabled by consumer options.
 * - Validates expected response ID and submission timestamp as non-empty string types.
 * - Preserves consumer lifecycle callbacks (onSuccess, onError, onSettled, onMutate).
 * - Does not modify or invalidate organiser survey cache.
 */
export function useSubmitPublicSurvey(
  surveyId: string,
  options?: UseMutationOptions<
    SurveySubmitSuccessResponse,
    SurveyApiError,
    SurveySubmitPayload
  >
) {
  const cleanId = typeof surveyId === 'string' ? surveyId.trim() : '';

  return useMutation({
    ...options,
    mutationFn: async (payload: SurveySubmitPayload) => {
      if (!cleanId) {
        throw new SurveyApiError('Survey ID is required for response submission.', 400, {
          detail: 'Survey ID is required for response submission.',
        });
      }

      const res = await surveyClientService.submitPublicSurvey(cleanId, payload);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to submit survey responses.');
      }

      const { response_id, submitted_at } = res.data;
      const hasValidResponseId = typeof response_id === 'string' && response_id.trim().length > 0;
      const hasValidSubmittedAt = typeof submitted_at === 'string' && submitted_at.trim().length > 0;

      if (!hasValidResponseId || !hasValidSubmittedAt) {
        throw new SurveyApiError(
          'Malformed server response: missing or invalid submission confirmation details.',
          502,
          res.data
        );
      }

      return res.data;
    },
    retry: false,
  });
}

// =================================================================
// 8. Survey Lifecycle & Payment Mutation Hooks
// =================================================================

export interface PublishSurveyVariables {
  surveyId: string;
}

/**
 * Publishes a survey, opening it to receive submissions.
 * Requires that payment has been completed and at least one question exists.
 * If payment is required, backend returns HTTP 402 with code 'PAYMENT_REQUIRED'.
 * Automatic retries are disabled (retry: false).
 */
export function usePublishSurvey(
  options?: UseMutationOptions<PublishSurveyResponse, SurveyApiError, PublishSurveyVariables>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async ({ surveyId }: PublishSurveyVariables) => {
      const cleanId = surveyId ? surveyId.trim() : '';
      if (!cleanId) {
        throw new SurveyApiError('Survey ID is required to publish.', 400, {
          detail: 'Survey ID is required to publish.',
        });
      }

      const res = await surveyClientService.publishSurvey(cleanId);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to publish survey.');
      }
      return res.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(variables.surveyId.trim()) });
      await queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: surveyKeys.projectLists() });

      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
    retry: false,
  });
}

export interface CloseSurveyVariables {
  surveyId: string;
}

/**
 * Closes an active published survey, stopping new submissions.
 * Existing responses are preserved.
 * Automatic retries are disabled (retry: false).
 */
export function useCloseSurvey(
  options?: UseMutationOptions<CloseSurveyResponse, SurveyApiError, CloseSurveyVariables>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async ({ surveyId }: CloseSurveyVariables) => {
      const cleanId = surveyId ? surveyId.trim() : '';
      if (!cleanId) {
        throw new SurveyApiError('Survey ID is required to close survey.', 400, {
          detail: 'Survey ID is required to close survey.',
        });
      }

      const res = await surveyClientService.closeSurvey(cleanId);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to close survey.');
      }
      return res.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(variables.surveyId.trim()) });
      await queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: surveyKeys.projectLists() });

      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
    retry: false,
  });
}

export interface CreateSurveyPaymentOrderVariables {
  surveyId: string;
}

/**
 * Creates a Razorpay payment order for the survey publishing fee.
 * Automatic retries are disabled (retry: false).
 */
export function useCreateSurveyPaymentOrder(
  options?: UseMutationOptions<
    SurveyPaymentOrderResponse,
    SurveyApiError,
    CreateSurveyPaymentOrderVariables
  >
) {
  const { ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async ({ surveyId }: CreateSurveyPaymentOrderVariables) => {
      const cleanId = surveyId ? surveyId.trim() : '';
      if (!cleanId) {
        throw new SurveyApiError('Survey ID is required to create payment order.', 400, {
          detail: 'Survey ID is required to create payment order.',
        });
      }

      const res = await surveyClientService.createSurveyPaymentOrder(cleanId);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to create payment order.');
      }
      return res.data;
    },
    retry: false,
  });
}

export interface VerifySurveyPaymentVariables {
  surveyId: string;
  payload: SurveyPaymentVerifyPayload;
}

/**
 * Verifies Razorpay payment signature and marks survey as paid.
 * Automatic retries are disabled (retry: false).
 */
export function useVerifySurveyPayment(
  options?: UseMutationOptions<
    SurveyPaymentVerifyResponse,
    SurveyApiError,
    VerifySurveyPaymentVariables
  >
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async ({ surveyId, payload }: VerifySurveyPaymentVariables) => {
      const cleanId = surveyId ? surveyId.trim() : '';
      if (!cleanId) {
        throw new SurveyApiError('Survey ID is required to verify payment.', 400, {
          detail: 'Survey ID is required to verify payment.',
        });
      }

      const res = await surveyClientService.verifySurveyPayment(cleanId, payload);
      if (!res.ok || !res.data) {
        throw parseSurveyApiError(res.error, res.status, 'Failed to verify payment.');
      }
      return res.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      // Invalidate survey detail so is_paid reflects immediately
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(variables.surveyId.trim()) });

      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, context);
      }
    },
    retry: false,
  });
}

