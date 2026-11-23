import { bffFetch, BffResponse } from '@/lib/api/bff-client';
import {
  SurveyListItem,
  SurveyDetail,
  CreateSurveyPayload,
  UpdateSurveyPayload,
  PaginatedResponse,
  SurveyStatus,
  SurveyVisibility,
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

export interface SurveyListFilters {
  status?: SurveyStatus;
  project?: string;
  visibility?: SurveyVisibility;
  page?: number;
  page_size?: number;
}

export const surveyClientService = {
  /**
   * Fetches all surveys created by the authenticated user across projects.
   * Invokes Next.js BFF endpoint: GET /api/surveys
   * Always requests mine=true via the BFF handler.
   */
  async getSurveys(
    filters?: SurveyListFilters
  ): Promise<BffResponse<PaginatedResponse<SurveyListItem>>> {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.page_size) params.set('page_size', filters.page_size.toString());
    if (filters?.status) params.set('status', filters.status);
    if (filters?.project) params.set('project', filters.project);
    if (filters?.visibility) params.set('visibility', filters.visibility);

    const queryString = params.toString();
    const endpoint = `/api/surveys${queryString ? `?${queryString}` : ''}`;
    return bffFetch<PaginatedResponse<SurveyListItem>>(endpoint, { method: 'GET' });
  },

  /**
   * Fetches surveys scoped strictly to a specific EventProject workspace.
   * Invokes Next.js BFF endpoint: GET /api/projects/[id]/surveys
   */
  async getProjectSurveys(
    projectId: string,
    page = 1,
    pageSize = 20
  ): Promise<BffResponse<PaginatedResponse<SurveyListItem>>> {
    const params = new URLSearchParams();
    if (page) params.set('page', page.toString());
    if (pageSize) params.set('page_size', pageSize.toString());

    const queryString = params.toString();
    const endpoint = `/api/projects/${projectId}/surveys${queryString ? `?${queryString}` : ''}`;
    return bffFetch<PaginatedResponse<SurveyListItem>>(endpoint, { method: 'GET' });
  },

  /**
   * Fetches complete survey detail including nested questions & choices.
   * Invokes Next.js BFF endpoint: GET /api/surveys/[surveyId]
   */
  async getSurveyById(surveyId: string): Promise<BffResponse<SurveyDetail>> {
    return bffFetch<SurveyDetail>(`/api/surveys/${surveyId}`, { method: 'GET' });
  },

  /**
   * Creates a new draft survey associated with an owned EventProject.
   * Invokes Next.js BFF endpoint: POST /api/surveys
   */
  async createSurvey(payload: CreateSurveyPayload): Promise<BffResponse<SurveyDetail>> {
    return bffFetch<SurveyDetail>('/api/surveys', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Partially updates survey metadata (title, dates, duplicate rules, visibility).
   * Invokes Next.js BFF endpoint: PATCH /api/surveys/[surveyId]
   */
  async updateSurvey(
    surveyId: string,
    payload: UpdateSurveyPayload
  ): Promise<BffResponse<SurveyDetail>> {
    return bffFetch<SurveyDetail>(`/api/surveys/${surveyId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Deletes a draft survey.
   * Backend will reject with HTTP 400 if responses have already been recorded.
   * Invokes Next.js BFF endpoint: DELETE /api/surveys/[surveyId]
   */
  async deleteSurvey(surveyId: string): Promise<BffResponse<unknown>> {
    return bffFetch<unknown>(`/api/surveys/${surveyId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Adds a new question (and optional choices) to the specified survey.
   * Invokes Next.js BFF endpoint: POST /api/surveys/[surveyId]/questions
   */
  async addQuestion(
    surveyId: string,
    payload: CreateQuestionPayload
  ): Promise<BffResponse<Question>> {
    return bffFetch<Question>(`/api/surveys/${surveyId}/questions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Partially updates question properties (text, is_required, order).
   * Invokes Next.js BFF endpoint: PATCH /api/questions/[questionId]
   */
  async updateQuestion(
    questionId: string,
    payload: UpdateQuestionPayload
  ): Promise<BffResponse<Question>> {
    return bffFetch<Question>(`/api/questions/${questionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Deletes a question and its choices.
   * Invokes Next.js BFF endpoint: DELETE /api/questions/[questionId]
   */
  async deleteQuestion(questionId: string): Promise<BffResponse<unknown>> {
    return bffFetch<unknown>(`/api/questions/${questionId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Adds a new choice to an existing single or multiple choice question.
   * Invokes Next.js BFF endpoint: POST /api/questions/[questionId]/choices
   */
  async addChoice(
    questionId: string,
    payload: CreateChoicePayload
  ): Promise<BffResponse<QuestionChoice>> {
    return bffFetch<QuestionChoice>(`/api/questions/${questionId}/choices`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Deletes a choice option from a question.
   * Invokes Next.js BFF endpoint: DELETE /api/choices/[choiceId]
   */
  async deleteChoice(choiceId: string): Promise<BffResponse<unknown>> {
    return bffFetch<unknown>(`/api/choices/${choiceId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Fetches public survey detail for respondent participation.
   * Invokes Next.js BFF endpoint: GET /api/public/surveys/[surveyId]
   */
  async getPublicSurvey(surveyId: string): Promise<BffResponse<SurveyDetail>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<SurveyDetail>(`/api/public/surveys/${cleanId}`, { method: 'GET' });
  },

  /**
   * Submits respondent answers to an active public survey.
   * Invokes Next.js BFF endpoint: POST /api/public/surveys/[surveyId]/submit
   */
  async submitPublicSurvey(
    surveyId: string,
    payload: SurveySubmitPayload
  ): Promise<BffResponse<SurveySubmitSuccessResponse>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<SurveySubmitSuccessResponse>(`/api/public/surveys/${cleanId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Publishes a draft survey, opening it to receive respondent submissions.
   * Invokes Next.js BFF endpoint: POST /api/surveys/[surveyId]/publish
   * If payment is required, backend returns HTTP 402 with code PAYMENT_REQUIRED.
   */
  async publishSurvey(surveyId: string): Promise<BffResponse<PublishSurveyResponse>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<PublishSurveyResponse>(`/api/surveys/${cleanId}/publish`, {
      method: 'POST',
    });
  },

  /**
   * Closes an active published survey, stopping any further submissions.
   * Invokes Next.js BFF endpoint: POST /api/surveys/[surveyId]/close
   */
  async closeSurvey(surveyId: string): Promise<BffResponse<CloseSurveyResponse>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<CloseSurveyResponse>(`/api/surveys/${cleanId}/close`, {
      method: 'POST',
    });
  },

  /**
   * Creates a Razorpay order to pay the survey publishing fee.
   * Invokes Next.js BFF endpoint: POST /api/surveys/[surveyId]/payment/order
   */
  async createSurveyPaymentOrder(surveyId: string): Promise<BffResponse<SurveyPaymentOrderResponse>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<SurveyPaymentOrderResponse>(`/api/surveys/${cleanId}/payment/order`, {
      method: 'POST',
    });
  },

  /**
   * Submits Razorpay payment credentials and HMAC signature to mark the survey as paid.
   * Invokes Next.js BFF endpoint: POST /api/surveys/[surveyId]/payment/verify
   */
  async verifySurveyPayment(
    surveyId: string,
    payload: SurveyPaymentVerifyPayload
  ): Promise<BffResponse<SurveyPaymentVerifyResponse>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<SurveyPaymentVerifyResponse>(`/api/surveys/${cleanId}/payment/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
