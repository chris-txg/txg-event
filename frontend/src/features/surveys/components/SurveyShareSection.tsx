'use client';

import React, { useState, useSyncExternalStore } from 'react';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Lock,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SurveyDetail } from '@/features/surveys/types/survey.types';

export interface SurveyShareSectionProps {
  survey: SurveyDetail;
}

export function SurveyShareSection({ survey }: SurveyShareSectionProps) {
  const origin = useSyncExternalStore(
    () => () => {},
    () => (typeof window !== 'undefined' ? window.location.origin : ''),
    () => ''
  );

  const [isCopied, setIsCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const shareUrl = origin ? `${origin}/s/${survey.id}` : `/s/${survey.id}`;

  const isDraft = survey.status === 'draft';
  const isClosed = survey.status === 'closed';

  const handleCopyLink = async () => {
    setCopyError(null);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      setCopyError('Could not copy link to clipboard. Please manually select and copy the URL.');
    }
  };

  const handleOpenPreview = () => {
    window.open(`/s/${survey.id}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs space-y-5 text-left">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F8EFF2]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F4E5EA] text-[#762D46] flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5 text-[#762D46]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#30232A]">Share & Distribute</h2>
            <p className="text-xs text-stone-500">
              Direct respondent link and distribution settings
            </p>
          </div>
        </div>

        {/* Visibility Pill */}
        <div>
          {survey.visibility === 'public' ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              Public Access
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              Private (Auth Required)
            </span>
          )}
        </div>
      </div>

      {/* Draft Warning if applicable */}
      {isDraft && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Notice:</strong> This survey is in <strong>Draft mode</strong>. Respondents opening
            this link will see an inactive message and cannot submit answers until you publish the
            survey above.
          </div>
        </div>
      )}

      {/* Closed Warning if applicable */}
      {isClosed && (
        <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-700 flex items-start gap-2.5 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
          <div>
            <strong>Notice:</strong> This survey is <strong>Closed</strong>. The link remains valid for
            viewing closure notices, but no new responses are accepted.
          </div>
        </div>
      )}

      {/* URL Input & Copy Bar */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#30232A]">Respondent Survey URL</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#762D46]/30 select-all"
            />
          </div>

          <Button
            onClick={handleCopyLink}
            variant={isCopied ? 'secondary' : 'primary'}
            className="shrink-0 text-xs"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700 mr-1.5" />
                <span className="text-emerald-800 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                <span>Copy Link</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleOpenPreview}
            className="shrink-0 text-xs"
            title="Preview Respondent Experience"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-stone-600" />
            <span>Preview</span>
          </Button>
        </div>

        {copyError && <p className="text-xs text-rose-600 mt-1">{copyError}</p>}
      </div>

      {/* Participation Rules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
          <p className="text-stone-500 font-medium flex items-center gap-1.5">
            {survey.visibility === 'public' ? (
              <Globe className="w-3.5 h-3.5 text-sky-600" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-purple-600" />
            )}
            Access Audience
          </p>
          <p className="font-semibold text-stone-800">
            {survey.visibility === 'public'
              ? 'Anyone with the link'
              : 'Authenticated accounts only'}
          </p>
          <p className="text-[11px] text-stone-500">
            {survey.visibility === 'public'
              ? 'Open to public internet participants'
              : 'Respondents must log in to participate'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
          <p className="text-stone-500 font-medium flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#762D46]" />
            Anonymous Answers
          </p>
          <p className="font-semibold text-stone-800">
            {survey.allow_anonymous ? 'Permitted' : 'Strictly Named'}
          </p>
          <p className="text-[11px] text-stone-500">
            {survey.allow_anonymous
              ? 'No account required to submit'
              : 'Submissions are linked to respondent user account'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
          <p className="text-stone-500 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#762D46]" />
            Submission Frequency
          </p>
          <p className="font-semibold text-stone-800">
            {survey.duplicate_rule === 'one_per_user'
              ? 'One per User'
              : survey.duplicate_rule === 'one_per_ip'
              ? 'One per IP Address'
              : 'Multiple Allowed'}
          </p>
          <p className="text-[11px] text-stone-500">
            {survey.duplicate_rule === 'one_per_user'
              ? 'Enforced on authenticated accounts'
              : survey.duplicate_rule === 'one_per_ip'
              ? 'Enforced on respondent network IP'
              : 'Participants can take the survey multiple times'}
          </p>
        </div>
      </div>
    </div>
  );
}
