from django.urls import path

from survey.views import (
    MySubmissionsListView,
    PublicSurveyRetrieveView,
    PublicSurveySubmitView,
    QuestionChoiceCreateView,
    QuestionChoiceDetailView,
    QuestionDetailView,
    QuestionListCreateView,
    QuestionExcelTemplateView,
    QuestionBulkUploadView,
    RazorpayWebhookView,
    SurveyAnalyticsView,
    SurveyCloseView,
    SurveyCouponValidateView,
    SurveyCreatePaymentOrderView,
    SurveyDetailView,
    SurveyListCreateView,
    SurveyPricingOptionsListView,
    SurveyPublishView,
    SurveyReportDownloadView,
    SurveyResponsesListView,
    SurveyVerifyPaymentView,
)

urlpatterns = [
    # -------------------------------------------------------------
    # Survey Management (Creator / Admin)
    # -------------------------------------------------------------
    path("api/surveys/", SurveyListCreateView.as_view(), name="survey_list_create"),
    # Note: static paths must precede <uuid:id> to avoid route collision
    path("api/surveys/pricing-options/", SurveyPricingOptionsListView.as_view(), name="survey_pricing_options"),
    path("api/surveys/my-submissions/", MySubmissionsListView.as_view(), name="survey_my_submissions"),
    path("api/surveys/<uuid:id>/", SurveyDetailView.as_view(), name="survey_detail"),
    path("api/surveys/<uuid:id>/publish/", SurveyPublishView.as_view(), name="survey_publish"),
    path("api/surveys/<uuid:id>/close/", SurveyCloseView.as_view(), name="survey_close"),

    # -------------------------------------------------------------
    # Razorpay Payment & Coupon APIs
    # -------------------------------------------------------------
    path("api/surveys/<uuid:id>/coupons/validate/", SurveyCouponValidateView.as_view(), name="survey_coupon_validate"),
    path("api/surveys/<uuid:id>/payment/order/", SurveyCreatePaymentOrderView.as_view(), name="survey_payment_order"),
    path("api/surveys/<uuid:id>/payment/verify/", SurveyVerifyPaymentView.as_view(), name="survey_payment_verify"),
    path("api/payments/razorpay/webhook/", RazorpayWebhookView.as_view(), name="razorpay_webhook"),



    # -------------------------------------------------------------
    # Question & Choice Management
    # -------------------------------------------------------------
    path("api/surveys/<uuid:id>/questions/", QuestionListCreateView.as_view(), name="survey_questions_create"),
    path("api/surveys/<uuid:id>/questions/template/", QuestionExcelTemplateView.as_view(), name="survey_questions_template"),
    path("api/surveys/<uuid:id>/questions/bulk-upload/", QuestionBulkUploadView.as_view(), name="survey_questions_bulk_upload"),
    path("api/questions/<uuid:id>/", QuestionDetailView.as_view(), name="question_detail"),
    path("api/questions/<uuid:id>/choices/", QuestionChoiceCreateView.as_view(), name="question_choice_create"),
    path("api/choices/<uuid:id>/", QuestionChoiceDetailView.as_view(), name="choice_detail"),

    # -------------------------------------------------------------
    # Respondent APIs (Public & Authenticated)
    # -------------------------------------------------------------
    path("api/public/surveys/<uuid:id>/", PublicSurveyRetrieveView.as_view(), name="public_survey_detail"),
    path("api/public/surveys/<uuid:id>/submit/", PublicSurveySubmitView.as_view(), name="public_survey_submit"),

    # -------------------------------------------------------------
    # Analytics APIs
    # -------------------------------------------------------------
    path("api/surveys/<uuid:id>/responses/", SurveyResponsesListView.as_view(), name="survey_responses_list"),
    path("api/surveys/<uuid:id>/analytics/", SurveyAnalyticsView.as_view(), name="survey_analytics"),
    path("api/surveys/<uuid:id>/report/download/", SurveyReportDownloadView.as_view(), name="survey_report_download"),
]

