/**
 * Survey Module Domain Types & Contracts
 * 
 * Verified against Django REST Framework backend:
 * - backend/src/survey/models.py
 * - backend/src/survey/serializers.py
 * - backend/src/survey/views.py
 * - backend/src/core/pagination.py
 */

// =================================================================
// 1. Primitive Domain Enums & Choices (Source: models.py:12-32, 112-120)
// =================================================================

/**
 * Status choices permitted by Survey model (models.py:12-15)
 * Initial on creation: 'draft'
 * After publish: 'published'
 * After close: 'closed'
 */
export type SurveyStatus = 'draft' | 'published' | 'closed';

/**
 * Visibility choices permitted by Survey model (models.py:17-19)
 */
export type SurveyVisibility = 'public' | 'private';

/**
 * Duplicate submission rules supported by backend (models.py:21-25)
 */
export type DuplicateRule = 'allow_multiple' | 'one_per_user' | 'one_per_ip';

/**
 * Supported question types in Question model (models.py:112-120)
 */
export type QuestionType =
  | 'text'
  | 'number'
  | 'single'
  | 'multiple'
  | 'boolean'
  | 'date';

// =================================================================
// 2. Question & Choice Contracts
// =================================================================

/**
 * Choice item returned from QuestionChoiceSerializer (serializers.py:12-16)
 */
export interface QuestionChoice {
  id: string;
  text: string;
  order: number;
}

/**
 * Question detail returned from QuestionSerializer (serializers.py:18-35)
 */
export interface Question {
  id: string;
  survey: string;
  text: string;
  question_type: QuestionType;
  is_required: boolean;
  order: number;
  choices: QuestionChoice[];
  created_at: string;
  updated_at: string;
}

/**
 * Request payload for adding a question to a survey:
 * POST /api/surveys/<id>/questions/
 * Processed by QuestionCreateSerializer (serializers.py:37-72)
 */
export interface CreateQuestionPayload {
  text: string;
  question_type: QuestionType;
  is_required?: boolean;
  order?: number;
  /**
   * Choices are passed as an array of plain strings on question creation.
   * Required when question_type is 'single' or 'multiple'.
   */
  choices?: string[];
}

/**
 * Request payload for partially updating question properties:
 * PATCH /api/questions/<id>/
 * Processed by QuestionSerializer (serializers.py:18-35)
 * Note: question_type is intentionally omitted to maintain schema integrity.
 */
export interface UpdateQuestionPayload {
  text?: string;
  is_required?: boolean;
  order?: number;
}

/**
 * Request payload for adding a choice to an existing question:
 * POST /api/questions/<id>/choices/
 * Processed by QuestionChoiceSerializer (serializers.py:12-16)
 */
export interface CreateChoicePayload {
  text: string;
  order?: number;
}

// =================================================================
// 3. Survey Contracts (List vs Detail)
// =================================================================

/**
 * Survey list item returned from:
 * - GET /api/surveys/ (SurveyListSerializer, serializers.py:74-101)
 * - GET /api/projects/<id>/surveys/ (EventProjectSurveysListView)
 */
export interface SurveyListItem {
  id: string;
  project: string;
  project_name: string | null;
  title: string;
  description: string;
  status: SurveyStatus;
  visibility: SurveyVisibility;
  allow_anonymous: boolean;
  duplicate_rule: DuplicateRule;
  start_date: string | null;
  end_date: string | null;
  is_paid: boolean;
  created_by_username: string;
  is_active: boolean;
  response_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Full survey detail with nested questions & choices returned from:
 * - GET /api/surveys/<id>/ (SurveyDetailSerializer, serializers.py:103-142)
 * - GET /api/public/surveys/<id>/ (PublicSurveyRetrieveView)
 */
export interface SurveyDetail extends SurveyListItem {
  questions: Question[];
}

/**
 * Request payload for creating a survey:
 * POST /api/surveys/
 * Processed by SurveyCreateUpdateSerializer (serializers.py:144-181)
 */
export interface CreateSurveyPayload {
  /**
   * Mandatory UUID of the EventProject this survey belongs to.
   * User must be the owner of this project.
   */
  project: string;
  title: string;
  description?: string;
  visibility?: SurveyVisibility;
  allow_anonymous?: boolean;
  duplicate_rule?: DuplicateRule;
  start_date?: string | null;
  end_date?: string | null;
}

/**
 * Request payload for partially updating survey metadata:
 * PATCH /api/surveys/<id>/
 * Processed by SurveyCreateUpdateSerializer (serializers.py:144-181)
 */
export interface UpdateSurveyPayload {
  project?: string;
  title?: string;
  description?: string;
  status?: SurveyStatus;
  visibility?: SurveyVisibility;
  allow_anonymous?: boolean;
  duplicate_rule?: DuplicateRule;
  start_date?: string | null;
  end_date?: string | null;
}

// =================================================================
// 4. Response & Answer Submission Contracts
// =================================================================

/**
 * Permitted JSON values for answer submissions depending on QuestionType:
 * - 'text'     -> string
 * - 'number'   -> number
 * - 'boolean'  -> boolean
 * - 'date'     -> string ("YYYY-MM-DD")
 * - 'single'   -> string (choice UUID or choice text)
 * - 'multiple' -> string[] (array of choice UUIDs or choice texts)
 */
export type AnswerValue = string | number | boolean | string[] | null;

/**
 * Single answer submission item in SurveySubmitSerializer (serializers.py:183-186)
 */
export interface AnswerSubmissionItem {
  question_id: string;
  value: AnswerValue;
}

/**
 * Request payload for submitting answers to an active survey:
 * POST /api/public/surveys/<id>/submit/
 * Processed by SurveySubmitSerializer (serializers.py:188-294)
 */
export interface SurveySubmitPayload {
  answers: AnswerSubmissionItem[];
}

/**
 * Response payload returned upon successful survey submission (views.py:530-538)
 */
export interface SurveySubmitSuccessResponse {
  message: string;
  response_id: string;
  submitted_at: string;
}

/**
 * Answer detail object returned in SurveyResponseDetailSerializer (serializers.py:296-309)
 */
export interface AnswerDetail {
  id: string;
  question: string;
  question_text: string;
  question_type: QuestionType;
  value: unknown;
}

/**
 * Recorded survey submission item returned from:
 * - GET /api/surveys/<id>/responses/ (SurveyResponseDetailSerializer, serializers.py:311-328)
 * - GET /api/surveys/my-submissions/ (MySubmissionsListView)
 */
export interface SurveyResponseDetail {
  id: string;
  survey_id: string;
  survey_title: string;
  respondent: string;
  respondent_ip: string | null;
  submitted_at: string;
  answers: AnswerDetail[];
}

// =================================================================
// 5. Pagination Envelope Contract
// =================================================================

/**
 * Standard paginated response envelope from StandardResultsSetPagination (pagination.py:7-41)
 * Default page_size: 20, max_page_size: 100
 */
export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// =================================================================
// 6. Survey Lifecycle & Payment Contracts (views.py:166-340)
// =================================================================

/**
 * Survey pricing option model contract:
 * GET /api/surveys/pricing-options/
 */
export interface SurveyPricingOption {
  id: string;
  name: string;
  code: string;
  description: string;
  price: string;
  currency: string;
  is_free: boolean;
  free_limit_per_user: number;
  is_active: boolean;
  display_order: number;
  features: string[];
  user_used_count: number;
  user_remaining_count: number;
  is_available_for_user: boolean;
}

/**
 * Request payload for publishing a survey:
 * POST /api/surveys/<id>/publish/
 */
export interface SurveyPublishPayload {
  pricing_option_code?: string;
  pricing_option_id?: string;
}

/**
 * Request payload for creating a payment order:
 * POST /api/surveys/<id>/payment/order/
 */
export interface SurveyPaymentOrderPayload {
  pricing_option_code?: string;
  pricing_option_id?: string;
}

/**
 * Response payload returned upon successful survey publication:
 * POST /api/surveys/<id>/publish/
 */
export interface PublishSurveyResponse {
  message: string;
  status?: string;
  is_paid?: boolean;
  pricing_option?: string | null;
}

/**
 * Error payload returned when publish fails due to unpaid publishing fee:
 * HTTP 402 PAYMENT_REQUIRED from SurveyPublishView (views.py:183-192)
 */
export interface PaymentRequiredErrorPayload {
  detail: string;
  code: 'PAYMENT_REQUIRED';
  survey_id: string;
  payment_order_url: string;
  pricing_options_url?: string;
}

/**
 * Response payload returned upon successful survey closure:
 * POST /api/surveys/<id>/close/
 */
export interface CloseSurveyResponse {
  message: string;
}

/**
 * Response payload returned when creating a Razorpay order:
 * POST /api/surveys/<id>/payment/order/
 * Serialized by SurveyPaymentOrderResponseSerializer (serializers.py:330-338)
 */
export interface SurveyPaymentOrderResponse {
  order_id: string;
  amount: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  survey_id: string;
  survey_title: string;
  pricing_option_code?: string;
  pricing_option_name?: string;
}

/**
 * Request payload for verifying a completed Razorpay payment:
 * POST /api/surveys/<id>/payment/verify/
 * Processed by SurveyPaymentVerifySerializer (serializers.py:340-344)
 */
export interface SurveyPaymentVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Response payload returned upon successful Razorpay payment verification:
 * POST /api/surveys/<id>/payment/verify/ (views.py:279-288)
 */
export interface SurveyPaymentVerifyResponse {
  status: string;
  message: string;
  survey_id: string;
  is_paid: boolean;
  payment_id: string;
}

// =================================================================
// 7. Analytics Contracts (services.py:140-185, views.py:380-420)
// =================================================================

export interface ChoiceAnalyticsItem {
  choice_id?: string;
  option?: string;
  text?: string;
  count: number;
  percentage: number;
}

export interface NumericAnalyticsStats {
  average?: number | null;
  avg?: number | null;
  median?: number | null;
  min?: number | null;
  max?: number | null;
}

export interface QuestionAnalyticsItem {
  question_id: string;
  text: string;
  question_type: QuestionType;
  is_required?: boolean;
  answered_count?: number;
  total_answers?: number;
  distribution?: ChoiceAnalyticsItem[];
  choices?: ChoiceAnalyticsItem[];
  summary?: NumericAnalyticsStats;
  numeric_stats?: NumericAnalyticsStats;
  recent_samples?: string[];
  sample_responses?: string[];
}

export interface SurveyAnalyticsData {
  survey_id: string;
  survey_title: string;
  status: SurveyStatus;
  visibility: SurveyVisibility;
  is_active: boolean;
  total_responses: number;
  questions: QuestionAnalyticsItem[];
}

