import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Calendar, Hash, Home } from 'lucide-react';

export interface RespondentSuccessCardProps {
  message?: string;
  responseId: string;
  submittedAt: string;
}

function formatSubmissionTimestamp(isoString: string): string {
  if (!isoString || typeof isoString !== 'string') {
    return 'Recorded on server';
  }

  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    return isoString.trim().length > 0 ? isoString.trim() : 'Recorded on server';
  }

  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function RespondentSuccessCard({
  message = 'Thank you! Your survey responses have been submitted successfully.',
  responseId,
  submittedAt,
}: RespondentSuccessCardProps) {
  const formattedTimestamp = formatSubmissionTimestamp(submittedAt);

  return (
    <Card className="max-w-xl mx-auto text-center border-[#E9DDE1] shadow-xs space-y-6">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
        <CheckCircle2 className="w-9 h-9 text-emerald-600" aria-hidden="true" />
      </div>

      <CardHeader className="mb-2 space-y-2">
        <CardTitle className="text-2xl sm:text-3xl font-bold text-[#30232A]">
          Responses Recorded
        </CardTitle>
        <CardDescription className="text-sm text-[#75666D] leading-relaxed max-w-md mx-auto">
          {message}
        </CardDescription>
      </CardHeader>

      {/* Confirmation Metadata Receipt */}
      <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 sm:p-5 text-left space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <span className="text-[#75666D] font-medium flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-[#762D46]" aria-hidden="true" />
            <span>Response ID:</span>
          </span>
          <span className="font-mono text-[11px] sm:text-xs text-[#30232A] font-semibold bg-white px-2 py-0.5 rounded border border-stone-200 select-all truncate max-w-xs">
            {responseId}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <span className="text-[#75666D] font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#762D46]" aria-hidden="true" />
            <span>Submitted At:</span>
          </span>
          <span className="text-xs text-[#30232A] font-medium">
            {formattedTimestamp}
          </span>
        </div>
      </div>

      <div className="pt-2 flex justify-center">
        <Link href="/" className="w-full sm:w-auto">
          <Button variant="outline" size="md" className="w-full sm:w-auto gap-2">
            <Home className="w-4 h-4 text-[#762D46]" aria-hidden="true" />
            <span>Return to Home</span>
          </Button>
        </Link>
      </div>
    </Card>
  );
}
