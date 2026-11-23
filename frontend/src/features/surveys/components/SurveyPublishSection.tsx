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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import {
  SurveyDetail,
  SurveyPaymentOrderResponse,
} from '@/features/surveys/types/survey.types';
import {
  usePublishSurvey,
  useCreateSurveyPaymentOrder,
  SurveyApiError,
} from '@/features/surveys/hooks/useSurveys';
import { RazorpayPaymentModal } from './RazorpayPaymentModal';
import { CloseSurveyModal } from './CloseSurveyModal';

export interface SurveyPublishSectionProps {
  survey: SurveyDetail;
  onSurveyUpdated?: () => void;
}

export function SurveyPublishSection({ survey, onSurveyUpdated }: SurveyPublishSectionProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<SurveyPaymentOrderResponse | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const publishMutation = usePublishSurvey();
  const createOrderMutation = useCreateSurveyPaymentOrder();

  const hasQuestions = survey.questions && survey.questions.length > 0;
  const isDraft = survey.status === 'draft';
  const isPublished = survey.status === 'published';
  const isClosed = survey.status === 'closed';

  const handlePublishClick = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!hasQuestions) {
      setErrorMessage('Cannot publish a survey without questions. Please add at least one question below.');
      return;
    }

    try {
      const result = await publishMutation.mutateAsync({ surveyId: survey.id });
      setSuccessMessage(result.message || 'Survey published successfully!');
      if (onSurveyUpdated) onSurveyUpdated();
    } catch (err) {
      if (err instanceof SurveyApiError) {
        // Check for 402 Payment Required
        const originalErr = err.originalError as Record<string, unknown> | undefined;
        if (err.status === 402 || (originalErr && originalErr.code === 'PAYMENT_REQUIRED')) {
          await initiatePaymentOrder();
          return;
        }
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to publish survey.');
      }
    }
  };

  const initiatePaymentOrder = async () => {
    try {
      const order = await createOrderMutation.mutateAsync({ surveyId: survey.id });
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
    }
  };

  const handlePaymentSuccessAndPublish = async () => {
    try {
      const result = await publishMutation.mutateAsync({ surveyId: survey.id });
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
    return isNaN(d.getTime()) ? isoString : d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs space-y-5 text-left">
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
              Control survey availability and response collection
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

      {/* Draft State Card */}
      {isDraft && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Survey is in Draft Mode</span>
            </div>
            <p>
              Respondents cannot access or submit answers to this survey until it is published.
              Once published, the survey link will become active immediately.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {survey.is_paid ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Publishing Fee Paid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#762D46] bg-[#F4E5EA] px-2.5 py-0.5 rounded-full">
                  <CreditCard className="w-3.5 h-3.5 text-[#A84A63]" />
                  Publishing Fee: ₹499 INR
                </span>
              )}

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
          </div>

          {!hasQuestions && (
            <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>You must add at least one question below before this survey can be published.</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              onClick={handlePublishClick}
              disabled={!hasQuestions || publishMutation.isPending || createOrderMutation.isPending}
              isLoading={publishMutation.isPending || createOrderMutation.isPending}
              className="px-5"
            >
              <Send className="w-4 h-4 mr-2" />
              <span>{survey.is_paid ? 'Publish Survey' : 'Pay & Publish Survey'}</span>
            </Button>

            {!survey.is_paid && hasQuestions && (
              <button
                type="button"
                onClick={initiatePaymentOrder}
                disabled={createOrderMutation.isPending}
                className="text-xs text-[#762D46] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pre-pay publishing fee</span>
              </button>
            )}
          </div>
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
              When you are ready to conclude data collection, close the survey to stop new submissions.
            </p>
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
              intact and can be viewed in survey analytics.
            </p>
          </div>

          <p className="text-xs text-stone-500 italic">
            Note: Reopening a closed survey is not supported to preserve response window compliance.
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
