import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Clock } from 'lucide-react';

export interface RespondentClosedCardProps {
  title?: string;
  message?: string;
}

export function RespondentClosedCard({
  title = 'Survey Currently Inactive',
  message = 'This survey is not currently accepting responses. Please check back later or contact the event organiser.',
}: RespondentClosedCardProps) {
  return (
    <Card className="max-w-lg mx-auto text-center border-[#E9DDE1] shadow-xs">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-5 border border-amber-200">
        <Clock className="w-7 h-7 text-amber-600" aria-hidden="true" />
      </div>

      <CardHeader className="mb-5 space-y-2">
        <CardTitle className="text-xl sm:text-2xl font-bold text-[#30232A]">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-[#75666D] leading-relaxed">
          {message}
        </CardDescription>
      </CardHeader>

      <Alert variant="warning" className="text-left text-xs">
        Submissions for this questionnaire are temporarily suspended or concluded. No answers can be submitted at this time.
      </Alert>
    </Card>
  );
}
