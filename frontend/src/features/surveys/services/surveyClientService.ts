import { bffFetch, BffResponse } from '@/lib/api/bff-client';
import { BFF_ENDPOINTS } from '@/config/endpoints';
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
  SurveyPricingOption,
  SurveyPublishPayload,
  SurveyPaymentOrderPayload,
  CouponValidatePayload,
  CouponValidateResponse,
  SurveyAnalyticsData,
  SurveyResponseDetail,
} from '@/features/surveys/types/survey.types';

export interface SurveyListFilters {
  status?: SurveyStatus | string;
  project?: string;
  visibility?: SurveyVisibility;
  from_date?: string;
  to_date?: string;
  search?: string;
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
    if (filters?.from_date) params.set('from_date', filters.from_date);
    if (filters?.to_date) params.set('to_date', filters.to_date);
    if (filters?.search) params.set('search', filters.search);

    const queryString = params.toString();
    const endpoint = `${BFF_ENDPOINTS.SURVEYS.LIST}${queryString ? `?${queryString}` : ''}`;
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
    const endpoint = BFF_ENDPOINTS.PROJECTS.SURVEYS(projectId, queryString);
    return bffFetch<PaginatedResponse<SurveyListItem>>(endpoint, { method: 'GET' });
  },

  /**
   * Fetches complete survey detail including nested questions & choices.
   * Invokes Next.js BFF endpoint: GET /api/surveys/[surveyId]
   */
  async getSurveyById(surveyId: string): Promise<BffResponse<SurveyDetail>> {
    return bffFetch<SurveyDetail>(BFF_ENDPOINTS.SURVEYS.DETAIL(surveyId), { method: 'GET' });
  },

  /**
   * Creates a new draft survey associated with an owned EventProject.
   * Invokes Next.js BFF endpoint: POST /api/surveys
   */
  async createSurvey(payload: CreateSurveyPayload): Promise<BffResponse<SurveyDetail>> {
    return bffFetch<SurveyDetail>(BFF_ENDPOINTS.SURVEYS.LIST, {
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
    return bffFetch<SurveyDetail>(BFF_ENDPOINTS.SURVEYS.DETAIL(surveyId), {
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
    return bffFetch<unknown>(BFF_ENDPOINTS.SURVEYS.DETAIL(surveyId), {
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
    return bffFetch<Question>(BFF_ENDPOINTS.SURVEYS.QUESTIONS(surveyId), {
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
    return bffFetch<Question>(BFF_ENDPOINTS.QUESTIONS.DETAIL(questionId), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Deletes a question and its choices.
   * Invokes Next.js BFF endpoint: DELETE /api/questions/[questionId]
   */
  async deleteQuestion(questionId: string): Promise<BffResponse<unknown>> {
    return bffFetch<unknown>(BFF_ENDPOINTS.QUESTIONS.DETAIL(questionId), {
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
    return bffFetch<QuestionChoice>(BFF_ENDPOINTS.QUESTIONS.CHOICES(questionId), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Deletes a choice option from a question.
   * Invokes Next.js BFF endpoint: DELETE /api/choices/[choiceId]
   */
  async deleteChoice(choiceId: string): Promise<BffResponse<unknown>> {
    return bffFetch<unknown>(BFF_ENDPOINTS.CHOICES.DETAIL(choiceId), {
      method: 'DELETE',
    });
  },

  /**
   * Fetches public survey detail for respondent participation.
   * Invokes Next.js BFF endpoint: GET /api/public/surveys/[surveyId]
   */
  async getPublicSurvey(surveyId: string): Promise<BffResponse<SurveyDetail>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<SurveyDetail>(BFF_ENDPOINTS.PUBLIC_SURVEYS.DETAIL(cleanId), { method: 'GET' });
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
    return bffFetch<SurveySubmitSuccessResponse>(BFF_ENDPOINTS.PUBLIC_SURVEYS.SUBMIT(cleanId), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Retrieves active survey publishing pricing tiers/plans.
   * Invokes Next.js BFF endpoint: GET /api/surveys/pricing-options
   */
  async getPricingOptions(): Promise<BffResponse<SurveyPricingOption[]>> {
    return bffFetch<SurveyPricingOption[]>(BFF_ENDPOINTS.SURVEYS.PRICING_OPTIONS, {
      method: 'GET',
    });
  },

  /**
   * Publishes a draft survey, opening it to receive respondent submissions.
   * Invokes Next.js BFF endpoint: POST /api/surveys/[surveyId]/publish
   * If payment is required, backend returns HTTP 402 with code PAYMENT_REQUIRED.
   */
  async publishSurvey(
    surveyId: string,
    payload?: SurveyPublishPayload
  ): Promise<BffResponse<PublishSurveyResponse>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<PublishSurveyResponse>(BFF_ENDPOINTS.SURVEYS.PUBLISH(cleanId), {
      method: 'POST',
      body: payload ? JSON.stringify(payload) : undefined,
    });
  },

  /**
   * Closes an active published survey, stopping any further submissions.
   * Invokes Next.js BFF endpoint: POST /api/surveys/[surveyId]/close
   */
  async closeSurvey(surveyId: string): Promise<BffResponse<CloseSurveyResponse>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<CloseSurveyResponse>(BFF_ENDPOINTS.SURVEYS.CLOSE(cleanId), {
      method: 'POST',
    });
  },

  /**
   * Creates a Razorpay order to pay the survey publishing fee.
   * Invokes Next.js BFF endpoint: POST /api/surveys/[surveyId]/payment/order
   */
  async createSurveyPaymentOrder(
    surveyId: string,
    payload?: SurveyPaymentOrderPayload
  ): Promise<BffResponse<SurveyPaymentOrderResponse>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<SurveyPaymentOrderResponse>(BFF_ENDPOINTS.SURVEYS.PAYMENT_ORDER(cleanId), {
      method: 'POST',
      body: payload ? JSON.stringify(payload) : undefined,
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
    return bffFetch<SurveyPaymentVerifyResponse>(BFF_ENDPOINTS.SURVEYS.PAYMENT_VERIFY(cleanId), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Validates a coupon code against a survey and pricing plan.
   * Invokes Next.js BFF endpoint: POST /api/surveys/[surveyId]/coupons/validate
   */
  async validateCoupon(
    surveyId: string,
    payload: CouponValidatePayload
  ): Promise<BffResponse<CouponValidateResponse>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<CouponValidateResponse>(BFF_ENDPOINTS.SURVEYS.COUPON_VALIDATE(cleanId), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetches aggregated analytics summary for a survey.
   * Invokes Next.js BFF endpoint: GET /api/surveys/[surveyId]/analytics
   */
  async getSurveyAnalytics(surveyId: string): Promise<BffResponse<SurveyAnalyticsData>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    return bffFetch<SurveyAnalyticsData>(BFF_ENDPOINTS.SURVEYS.ANALYTICS(cleanId), {
      method: 'GET',
    });
  },

  /**
   * Fetches paginated individual submissions for a survey.
   * Invokes Next.js BFF endpoint: GET /api/surveys/[surveyId]/responses?page=<p>&page_size=<s>
   */
  async getSurveyResponses(
    surveyId: string,
    page = 1,
    pageSize = 20
  ): Promise<BffResponse<PaginatedResponse<SurveyResponseDetail>>> {
    const cleanId = surveyId ? surveyId.trim() : '';
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (pageSize) params.set('page_size', String(pageSize));
    const query = params.toString();
    return bffFetch<PaginatedResponse<SurveyResponseDetail>>(
      BFF_ENDPOINTS.SURVEYS.RESPONSES(cleanId, query),
      { method: 'GET' }
    );
  },
};
