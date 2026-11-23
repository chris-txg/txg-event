'use client';

import React, { useState } from 'react';
import {
  Send,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  AlertTriangle,
  Sparkles,
  Gift,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import {
  SurveyDetail,
  SurveyPaymentOrderResponse,
  SurveyPricingOption,
} from '@/features/surveys/types/survey.types';
import {
  usePublishSurvey,
  useCreateSurveyPaymentOrder,
  useSurveyPricingOptions,
  SurveyApiError,
} from '@/features/surveys/hooks/useSurveys';
import { RazorpayPaymentModal } from './RazorpayPaymentModal';
import { CloseSurveyModal } from './CloseSurveyModal';

export interface SurveyPublishSectionProps {
  survey: SurveyDetail;
  onSurveyUpdated?: () => void;
  onNavigateToAnalytics?: () => void;
}

export function SurveyPublishSection({
  survey,
  onSurveyUpdated,
  onNavigateToAnalytics,
}: SurveyPublishSectionProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<SurveyPaymentOrderResponse | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [processingPlanCode, setProcessingPlanCode] = useState<string | null>(null);

  const { data: pricingOptions, isLoading: isLoadingPricing } = useSurveyPricingOptions({
    enabled: survey.status === 'draft',
  });

  const publishMutation = usePublishSurvey();
  const createOrderMutation = useCreateSurveyPaymentOrder();

  const hasQuestions = survey.questions && survey.questions.length > 0;
  const isDraft = survey.status === 'draft';
  const isPublished = survey.status === 'published';
  const isClosed = survey.status === 'closed';

  // Handle Free or Already Paid Publishing
  const handlePublishFreeOrPaid = async (pricingCode?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setProcessingPlanCode(pricingCode || 'free');

    if (!hasQuestions) {
      setErrorMessage('Cannot publish a survey without questions. Please add at least one question below.');
      setProcessingPlanCode(null);
      return;
    }

    try {
      const result = await publishMutation.mutateAsync({
        surveyId: survey.id,
        payload: pricingCode ? { pricing_option_code: pricingCode } : undefined,
      });
      setSuccessMessage(result.message || 'Survey published successfully!');
      if (onSurveyUpdated) onSurveyUpdated();
    } catch (err) {
      if (err instanceof SurveyApiError) {
        // If backend responds with 402 PAYMENT_REQUIRED, redirect to payment flow
        const originalErr = err.originalError as Record<string, unknown> | undefined;
        if (err.status === 402 || (originalErr && originalErr.code === 'PAYMENT_REQUIRED')) {
          await initiatePaymentOrder(pricingCode);
          return;
        }
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to publish survey.');
      }
    } finally {
      setProcessingPlanCode(null);
    }
  };

  // Handle Paid Tier Razorpay Order Creation
  const initiatePaymentOrder = async (pricingCode?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setProcessingPlanCode(pricingCode || 'paid');

    if (!hasQuestions) {
      setErrorMessage('Cannot publish a survey without questions. Please add at least one question below.');
      setProcessingPlanCode(null);
      return;
    }

    try {
      const order = await createOrderMutation.mutateAsync({
        surveyId: survey.id,
        payload: pricingCode ? { pricing_option_code: pricingCode } : undefined,
      });
      setActivePaymentOrder(order);
      setIsPaymentModalOpen(true);
    } catch (orderErr) {
      if (orderErr instanceof SurveyApiError) {
        setErrorMessage(orderErr.message);
      } else if (orderErr instanceof Error) {
        setErrorMessage(orderErr.message);
      } else {
        setErrorMessage('Failed to create payment order. Please try again.');
      }
    } finally {
      setProcessingPlanCode(null);
    }
  };

  const handlePaymentSuccessAndPublish = async () => {
    try {
      const planCode = activePaymentOrder?.pricing_option_code;
      const result = await publishMutation.mutateAsync({
        surveyId: survey.id,
        payload: planCode ? { pricing_option_code: planCode } : undefined,
      });
      setSuccessMessage(result.message || 'Payment verified and survey published successfully!');
      if (onSurveyUpdated) onSurveyUpdated();
    } catch (pubErr) {
      if (pubErr instanceof SurveyApiError) {
        setErrorMessage(pubErr.message);
      } else if (pubErr instanceof Error) {
        setErrorMessage(pubErr.message);
      } else {
        setErrorMessage('Payment was verified, but an error occurred while activating publication.');
      }
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return null;
    const d = new Date(isoString);
    return isNaN(d.getTime())
      ? isoString
      : d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs space-y-6 text-left">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F8EFF2]">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isPublished
                ? 'bg-emerald-100 text-emerald-800'
                : isClosed
                ? 'bg-stone-100 text-stone-700'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isPublished ? (
              <Send className="w-5 h-5 text-emerald-700" />
            ) : isClosed ? (
              <Lock className="w-5 h-5 text-stone-600" />
            ) : (
              <Clock className="w-5 h-5 text-amber-700" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#30232A]">Publishing & Lifecycle</h2>
            <p className="text-xs text-stone-500">
              Control survey availability, pricing tiers, and response collection
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isPublished && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Published & Active
            </span>
          )}
          {isClosed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
              <span className="w-2 h-2 rounded-full bg-stone-400" />
              Closed
            </span>
          )}
          {isDraft && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Draft (Unpublished)
            </span>
          )}
        </div>
      </div>

      {/* Draft State Card & Pricing Options */}
      {isDraft && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-2 leading-relaxed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Survey is in Draft Mode</span>
              </div>
              {hasQuestions ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {survey.questions.length} Question{survey.questions.length === 1 ? '' : 's'} Configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-800 bg-rose-100/80 px-2.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  No Questions Added Yet
                </span>
              )}
            </div>
            <p>
              Respondents cannot access or submit answers until this survey is published. Once
              published, the public share link becomes active immediately.
            </p>
          </div>

          {!hasQuestions && (
            <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>You must add at least one question below before this survey can be published.</span>
            </p>
          )}

          {/* If already paid */}
          {survey.is_paid ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Publishing Fee Paid
                </p>
                <p className="text-emerald-800">
                  Your publishing activation is confirmed. Click below to make this survey live.
                </p>
              </div>
              <Button
                onClick={() => handlePublishFreeOrPaid()}
                disabled={!hasQuestions || publishMutation.isPending}
                isLoading={publishMutation.isPending}
                className="px-5 shrink-0"
              >
                <Send className="w-4 h-4 mr-2" />
                Publish Survey Now
              </Button>
            </div>
          ) : (
            /* Pricing Tier Selection Grid */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#30232A] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#762D46]" />
                  <span>Select Publishing Tier</span>
                </h3>
                <span className="text-xs text-stone-500">Choose a plan to publish your survey</span>
              </div>

              {isLoadingPricing ? (
                <div className="p-8 flex items-center justify-center">
                  <Spinner size="md" />
                  <span className="text-xs text-stone-500 ml-2">Loading available publishing plans...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dynamic Pricing Plans from Backend */}
                  {pricingOptions && pricingOptions.length > 0 ? (
                    pricingOptions.map((plan: SurveyPricingOption) => {
                      const isFreePlan = plan.is_free || Number(plan.price) === 0;
                      const hasFreeCredit =
                        isFreePlan &&
                        (plan.user_remaining_count === undefined ||
                          plan.user_remaining_count === null ||
                          plan.user_remaining_count > 0);
                      const isProcessingThis = processingPlanCode === plan.code;

                      return (
                        <div
                          key={plan.id}
                          className={`rounded-xl border p-4.5 flex flex-col justify-between space-y-4 transition-all ${
                            isFreePlan
                              ? 'bg-gradient-to-br from-emerald-50/60 to-white border-emerald-200 hover:border-emerald-300'
                              : 'bg-gradient-to-br from-[#FAF3F5] to-white border-[#E9DDE1] hover:border-[#762D46]/40'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    isFreePlan
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-[#F4E5EA] text-[#762D46]'
                                  }`}
                                >
                                  {isFreePlan ? (
                                    <Gift className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <CreditCard className="w-3 h-3 text-[#A84A63]" />
                                  )}
                                  {plan.name}
                                </span>
                                <h4 className="text-base font-bold text-[#30232A] mt-1.5">
                                  {isFreePlan ? 'Free Tier' : `₹${plan.price} ${plan.currency || 'INR'}`}
                                </h4>
                              </div>

                              {isFreePlan && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                                  {hasFreeCredit
                                    ? `${plan.user_remaining_count ?? 1} Free Credit Available`
                                    : 'Credits Used'}
                                </span>
                              )}
                            </div>

                            {plan.description && (
                              <p className="text-xs text-stone-600 leading-relaxed">
                                {plan.description}
                              </p>
                            )}

                            {/* Plan Features */}
                            {plan.features && plan.features.length > 0 && (
                              <ul className="text-xs text-stone-600 space-y-1 pt-1">
                                {plan.features.map((feat: string, idx: number) => (
                                  <li key={idx} className="flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{feat}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Action Button */}
                          <div>
                            {isFreePlan ? (
                              <Button
                                onClick={() => handlePublishFreeOrPaid(plan.code)}
                                disabled={
                                  !hasQuestions ||
                                  !hasFreeCredit ||
                                  publishMutation.isPending ||
                                  createOrderMutation.isPending
                                }
                                isLoading={isProcessingThis && publishMutation.isPending}
                                className="w-full text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
                              >
                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                {hasFreeCredit ? 'Publish for Free' : 'Free Credit Exhausted'}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => initiatePaymentOrder(plan.code)}
                                disabled={
                                  !hasQuestions ||
                                  publishMutation.isPending ||
                                  createOrderMutation.isPending
                                }
                                isLoading={isProcessingThis && createOrderMutation.isPending}
                                className="w-full text-xs font-semibold"
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                                Pay ₹{plan.price} & Publish
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Fallback standard options if no backend plans configured */
                    <>
                      {/* Free Tier Fallback */}
                      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-4.5 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Gift className="w-3 h-3 text-emerald-600" />
                            Free Plan
                          </span>
                          <h4 className="text-base font-bold text-[#30232A]">Free Tier</h4>
                          <p className="text-xs text-stone-600">
                            1 complimentary free survey publishing credit for organizers.
                          </p>
                          <ul className="text-xs text-stone-600 space-y-1 pt-1">
                            <li className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Instant public publishing</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Aggregated analytics & response exports</span>
                            </li>
                          </ul>
                        </div>
                        <Button
                          onClick={() => handlePublishFreeOrPaid(undefined)}
                          disabled={!hasQuestions || publishMutation.isPending}
                          isLoading={publishMutation.isPending && processingPlanCode === 'free'}
                          className="w-full text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Publish for Free
                        </Button>
                      </div>

                      {/* Standard Paid Tier Fallback */}
                      <div className="rounded-xl border border-[#E9DDE1] bg-gradient-to-br from-[#FAF3F5] to-white p-4.5 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F4E5EA] text-[#762D46]">
                            <CreditCard className="w-3 h-3 text-[#A84A63]" />
                            Standard Plan
                          </span>
                          <h4 className="text-base font-bold text-[#30232A]">₹499 INR</h4>
                          <p className="text-xs text-stone-600">
                            Standard single survey publishing activation via Razorpay.
                          </p>
                          <ul className="text-xs text-stone-600 space-y-1 pt-1">
                            <li className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Unlimited participant responses</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Instant UPI, Cards & Netbanking checkout</span>
                            </li>
                          </ul>
                        </div>
                        <Button
                          onClick={() => initiatePaymentOrder(undefined)}
                          disabled={!hasQuestions || createOrderMutation.isPending}
                          isLoading={createOrderMutation.isPending && processingPlanCode === 'paid'}
                          className="w-full text-xs font-semibold"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                          Pay ₹499 & Publish
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Published State Card */}
      {isPublished && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-2 leading-relaxed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Survey is Live & Accepting Responses</span>
              </div>
              {survey.start_date && (
                <span className="text-emerald-800 font-medium">
                  Active since {formatDate(survey.start_date)}
                </span>
              )}
            </div>
            <p>
              Your survey is publicly available to respondents according to its visibility rules.
              Share the link in the section below to distribute to your participants.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-stone-500">
              When data collection is concluded, close the survey to stop new submissions.
            </p>
            <div className="flex items-center gap-2">
              {onNavigateToAnalytics && (
                <Button
                  variant="outline"
                  onClick={onNavigateToAnalytics}
                  className="text-xs text-stone-700 border-stone-300 hover:bg-stone-50"
                >
                  View Analytics
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsCloseModalOpen(true)}
                className="text-rose-700 border-rose-300 hover:bg-rose-50 hover:text-rose-800 text-xs"
              >
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                <span>Close Survey</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Closed State Card */}
      {isClosed && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-700 space-y-2 leading-relaxed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-stone-900">
                <Lock className="w-4 h-4 text-stone-600" />
                <span>Survey is Closed</span>
              </div>
              <span className="font-semibold text-stone-800">
                {survey.response_count} {survey.response_count === 1 ? 'Response Recorded' : 'Responses Recorded'}
              </span>
            </div>
            <p>
              This survey is no longer accepting new participant responses. Existing answers remain
              intact and can be viewed in the survey analytics dashboard.
            </p>
          </div>

          <p className="text-xs text-stone-500 italic">
            Note: Closed surveys cannot be reopened to maintain audit integrity and response compliance.
          </p>
        </div>
      )}

      {/* Error Feedback */}
      {errorMessage && (
        <Alert variant="error" title="Publishing Error">
          <p>{errorMessage}</p>
        </Alert>
      )}

      {/* Success Feedback */}
      {successMessage && (
        <Alert variant="success" title="Success">
          <p>{successMessage}</p>
        </Alert>
      )}

      {/* Payment Checkout Modal */}
      {activePaymentOrder && (
        <RazorpayPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          survey={survey}
          order={activePaymentOrder}
          onPaymentSuccess={handlePaymentSuccessAndPublish}
        />
      )}

      {/* Close Survey Confirmation Modal */}
      <CloseSurveyModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        survey={survey}
        onSuccess={() => {
          if (onSurveyUpdated) onSurveyUpdated();
        }}
      />
    </div>
  );
}
