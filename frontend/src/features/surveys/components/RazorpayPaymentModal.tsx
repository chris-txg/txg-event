'use client';

import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import {
  SurveyDetail,
  SurveyPaymentOrderResponse,
} from '@/features/surveys/types/survey.types';
import {
  useVerifySurveyPayment,
  SurveyApiError,
} from '@/features/surveys/hooks/useSurveys';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
  prefill?: {
    name?: string;
    email?: string;
  };
}

interface RazorpayInstance {
  open: () => void;
  close?: () => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: SurveyDetail;
  order: SurveyPaymentOrderResponse;
  onPaymentSuccess: () => Promise<void> | void;
}



export function RazorpayPaymentModal({
  isOpen,
  onClose,
  survey,
  order,
  onPaymentSuccess,
}: RazorpayPaymentModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);

  const verifyMutation = useVerifySurveyPayment();

  if (!isOpen) return null;

  const isRealRazorpayKey = Boolean(
    order.key_id &&
      (order.key_id.startsWith('rzp_test_') || order.key_id.startsWith('rzp_live_')) &&
      !order.order_id.startsWith('order_mock_')
  );

  const handleLaunchOfficialRazorpay = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsOpeningCheckout(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Failed to load Razorpay Checkout SDK. Please check your network connection.');
      }

      const razorpay = new window.Razorpay({
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency || 'INR',
        name: 'Event Manager',
        description: `Publish Fee: ${survey.title.slice(0, 40)}`,
        order_id: order.order_id,
        theme: {
          color: '#762D46',
        },
        handler: async (response) => {
          try {
            await verifyMutation.mutateAsync({
              surveyId: survey.id,
              payload: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            await onPaymentSuccess();
            onClose();
          } catch (verifyErr) {
            if (verifyErr instanceof SurveyApiError) {
              setErrorMessage(verifyErr.message);
            } else if (verifyErr instanceof Error) {
              setErrorMessage(verifyErr.message);
            } else {
              setErrorMessage('Payment verification failed on the server.');
            }
          }
        },
        modal: {
          ondismiss: () => {
            setInfoMessage('Checkout was closed or cancelled. Your survey remains unpaid.');
          },
        },
      });

      razorpay.open();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to initialize payment checkout.');
    } finally {
      setIsOpeningCheckout(false);
    }
  };

  const handleSimulateMockPayment = async (signatureToUse = 'mock_signature_test') => {
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 12)}`;

      await verifyMutation.mutateAsync({
        surveyId: survey.id,
        payload: {
          razorpay_order_id: order.order_id,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: signatureToUse,
        },
      });

      await onPaymentSuccess();
      onClose();
    } catch (err) {
      if (err instanceof SurveyApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Mock payment verification failed on the server.');
      }
    }
  };

  const handleModalClose = () => {
    if (verifyMutation.isPending || isOpeningCheckout) return;
    setErrorMessage(null);
    setInfoMessage(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative text-left space-y-6">
        <button
          onClick={handleModalClose}
          disabled={verifyMutation.isPending || isOpeningCheckout}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#F4E5EA] text-[#762D46] flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 id="payment-modal-title" className="text-lg font-bold text-[#30232A]">
              Survey Publishing Fee
            </h3>
            <p className="text-xs text-stone-500">
              One-time publishing activation required by the platform.
            </p>
          </div>
        </div>

        {/* Order Details Summary Card */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Survey</span>
            <span className="font-semibold text-stone-800 truncate max-w-xs">{survey.title}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Order ID</span>
            <code className="font-mono text-stone-700 bg-white px-2 py-0.5 rounded border border-stone-200">
              {order.order_id}
            </code>
          </div>
          <div className="flex items-center justify-between border-t border-stone-200/80 pt-2 text-sm">
            <span className="font-semibold text-stone-700">Total Payable</span>
            <span className="font-bold text-[#762D46] text-base">
              ₹{order.amount} {order.currency}
            </span>
          </div>
        </div>

        {/* Mode-Specific Body */}
        {isRealRazorpayKey ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
              <span>
                Razorpay Test Mode credentials detected. Clicking below will open the official Razorpay
                test modal. No actual funds will be charged.
              </span>
            </div>

            <Button
              onClick={handleLaunchOfficialRazorpay}
              isLoading={isOpeningCheckout || verifyMutation.isPending}
              disabled={isOpeningCheckout || verifyMutation.isPending}
              className="w-full"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay ₹{order.amount} via Razorpay Test
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Development Sandbox Mode</span>
              </div>
              <p>
                The backend is operating in mock sandbox mode without active Razorpay API keys.
                Verification will be processed against the real Django payment verification endpoint
                with a cryptographically valid test signature.
              </p>
            </div>

            <div className="space-y-2.5">
              <Button
                onClick={() => handleSimulateMockPayment('mock_signature_test')}
                isLoading={verifyMutation.isPending}
                disabled={verifyMutation.isPending}
                className="w-full"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Verify Test Payment (₹{order.amount} INR)
              </Button>

              <button
                type="button"
                onClick={() => handleSimulateMockPayment('invalid_test_signature')}
                disabled={verifyMutation.isPending}
                className="w-full text-xs text-stone-500 hover:text-stone-700 py-1.5 hover:underline transition-colors disabled:opacity-50 cursor-pointer text-center"
              >
                Test Failure Path (Simulate Invalid Signature)
              </button>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <Alert variant="error" title="Payment Verification Error">
            <p>{errorMessage}</p>
          </Alert>
        )}

        {/* Info Feedback */}
        {infoMessage && (
          <Alert variant="info" title="Checkout Notice">
            <p>{infoMessage}</p>
          </Alert>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
          <Button
            variant="ghost"
            onClick={handleModalClose}
            disabled={verifyMutation.isPending || isOpeningCheckout}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
