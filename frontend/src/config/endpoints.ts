/**
 * Centralized Endpoints & URL Registry
 *
 * Single source of truth for all URLs across the application.
 * If any backend endpoint, internal route, or third-party script URL changes,
 * modify it ONLY in this file.
 */

// =================================================================
// 0. Base Configuration
// =================================================================

export const DJANGO_BASE_URL =
  process.env.DJANGO_API_URL || 'http://localhost:8000';

// =================================================================
// 1. Django REST API Endpoints (Server-Side BFF -> Django Backend)
// All Django routes enforce strict trailing slashes.
// =================================================================

export const DJANGO_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login/',
    REGISTER: '/api/auth/register/',
    LOGOUT: '/api/auth/logout/',
    ME: '/api/auth/me/',
    TOKEN_REFRESH: '/api/auth/token/refresh/',
    PASSWORD_RESET: '/api/auth/password/reset/',
    PASSWORD_RESET_CONFIRM: '/api/auth/password/reset/confirm/',
    PASSWORD_CHANGE: '/api/auth/password/change/',
    PROFILE_CUSTOMER: '/api/auth/profile/customer/',
    PROFILE_VENDOR: '/api/auth/profile/vendor/',
  },
  SURVEYS: {
    LIST_CREATE: '/api/surveys/',
    PRICING_OPTIONS: '/api/surveys/pricing-options/',
    MY_SUBMISSIONS: '/api/surveys/my-submissions/',
    DETAIL: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/`,
    PUBLISH: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/publish/`,
    CLOSE: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/close/`,
    PAYMENT_ORDER: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/payment/order/`,
    PAYMENT_VERIFY: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/payment/verify/`,
    COUPON_VALIDATE: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/coupons/validate/`,
    ANALYTICS: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/analytics/`,
    RESPONSES: (surveyId: string, queryString?: string) =>
      `/api/surveys/${encodeURIComponent(surveyId.trim())}/responses/${queryString ? `?${queryString}` : ''}`,
    REPORT_DOWNLOAD: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/report/download/`,
    QUESTIONS: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/questions/`,
    QUESTIONS_TEMPLATE: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/questions/template/`,
    QUESTIONS_BULK_UPLOAD: (surveyId: string, queryString?: string) =>
      `/api/surveys/${encodeURIComponent(surveyId.trim())}/questions/bulk-upload/${queryString ? `?${queryString}` : ''}`,
  },
  PUBLIC_SURVEYS: {
    DETAIL: (surveyId: string) => `/api/public/surveys/${encodeURIComponent(surveyId.trim())}/`,
    SUBMIT: (surveyId: string) => `/api/public/surveys/${encodeURIComponent(surveyId.trim())}/submit/`,
  },
  QUESTIONS: {
    DETAIL: (questionId: string) => `/api/questions/${encodeURIComponent(questionId.trim())}/`,
    CHOICES: (questionId: string) => `/api/questions/${encodeURIComponent(questionId.trim())}/choices/`,
  },
  CHOICES: {
    DETAIL: (choiceId: string) => `/api/choices/${encodeURIComponent(choiceId.trim())}/`,
  },
  PROJECTS: {
    LIST_CREATE: '/api/projects/',
    DETAIL: (projectId: string) => `/api/projects/${encodeURIComponent(projectId.trim())}/`,
    SURVEYS: (projectId: string, queryString?: string) =>
      `/api/projects/${encodeURIComponent(projectId.trim())}/surveys/${queryString ? `?${queryString}` : ''}`,
    DOCUMENT: (projectId: string, documentId: string) =>
      `/api/projects/${encodeURIComponent(projectId.trim())}/documents/${encodeURIComponent(documentId.trim())}/`,
  },
} as const;

// =================================================================
// 2. Next.js BFF Endpoints (Browser Client Services -> Next.js BFF)
// Client requests to /api/* routes handled by Next.js app router.
// =================================================================

export const BFF_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    TOKEN_REFRESH: '/api/auth/refresh',
    PASSWORD_RESET: '/api/auth/password/reset',
    PASSWORD_RESET_CONFIRM: '/api/auth/password/confirm',
    PASSWORD_CHANGE: '/api/auth/password/change',
    PROFILE_CUSTOMER: '/api/auth/profile/customer',
    PROFILE_VENDOR: '/api/auth/profile/vendor',
  },
  SURVEYS: {
    LIST: '/api/surveys',
    PRICING_OPTIONS: '/api/surveys/pricing-options',
    DETAIL: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}`,
    PUBLISH: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/publish`,
    CLOSE: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/close`,
    PAYMENT_ORDER: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/payment/order`,
    PAYMENT_VERIFY: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/payment/verify`,
    COUPON_VALIDATE: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/coupons/validate`,
    ANALYTICS: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/analytics`,
    RESPONSES: (surveyId: string, queryString?: string) =>
      `/api/surveys/${encodeURIComponent(surveyId.trim())}/responses${queryString ? `?${queryString}` : ''}`,
    REPORT_DOWNLOAD: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/report/download`,
    QUESTIONS: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/questions`,
    QUESTIONS_TEMPLATE: (surveyId: string) => `/api/surveys/${encodeURIComponent(surveyId.trim())}/questions/template`,
    QUESTIONS_BULK_UPLOAD: (surveyId: string, queryString?: string) =>
      `/api/surveys/${encodeURIComponent(surveyId.trim())}/questions/bulk-upload${queryString ? `?${queryString}` : ''}`,
  },
  PUBLIC_SURVEYS: {
    DETAIL: (surveyId: string) => `/api/public/surveys/${encodeURIComponent(surveyId.trim())}`,
    SUBMIT: (surveyId: string) => `/api/public/surveys/${encodeURIComponent(surveyId.trim())}/submit`,
  },
  QUESTIONS: {
    DETAIL: (questionId: string) => `/api/questions/${encodeURIComponent(questionId.trim())}`,
    CHOICES: (questionId: string) => `/api/questions/${encodeURIComponent(questionId.trim())}/choices`,
  },
  CHOICES: {
    DETAIL: (choiceId: string) => `/api/choices/${encodeURIComponent(choiceId.trim())}`,
  },
  PROJECTS: {
    LIST: '/api/projects',
    DETAIL: (projectId: string) => `/api/projects/${encodeURIComponent(projectId.trim())}`,
    SURVEYS: (projectId: string, queryString?: string) =>
      `/api/projects/${encodeURIComponent(projectId.trim())}/surveys${queryString ? `?${queryString}` : ''}`,
    DOCUMENT: (projectId: string, documentId: string) =>
      `/api/projects/${encodeURIComponent(projectId.trim())}/documents/${encodeURIComponent(documentId.trim())}`,
  },
} as const;

// =================================================================
// 3. Application UI Navigation Routes (Pages, Links, Redirects)
// =================================================================

export const APP_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  REGISTER_CUSTOMER: '/register/customer',
  REGISTER_VENDOR: '/register/vendor',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  PROFILE: '/profile',
  SERVICES: '/services',
  RESEARCH_SURVEYS: '/services/research-surveys',
  PROJECTS: '/projects',
  PROJECT_NEW: '/projects/new',
  PROJECT_DETAIL: (id: string) => `/projects/${encodeURIComponent(id.trim())}`,
  PROJECT_EDIT: (id: string) => `/projects/${encodeURIComponent(id.trim())}/edit`,
  SURVEYS: '/surveys',
  ANALYTICS: '/analytics',
  SURVEY_NEW: (projectId?: string) =>
    projectId ? `/surveys/new?project=${encodeURIComponent(projectId.trim())}` : '/surveys/new',
  SURVEY_DETAIL: (id: string) => `/surveys/${encodeURIComponent(id.trim())}`,
  SURVEY_EDIT: (id: string) => `/surveys/${encodeURIComponent(id.trim())}/edit`,
  RESPONDENT_SURVEY: (surveyId: string) => `/s/${encodeURIComponent(surveyId.trim())}`,
} as const;

// =================================================================
// 4. External Scripts & Third-Party CDNs
// =================================================================

export const EXTERNAL_SCRIPTS = {
  RAZORPAY_CHECKOUT: 'https://checkout.razorpay.com/v1/checkout.js',
} as const;
