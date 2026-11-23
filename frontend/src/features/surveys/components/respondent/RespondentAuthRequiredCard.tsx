import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Lock, LogIn } from 'lucide-react';

export interface RespondentAuthRequiredCardProps {
  message?: string;
  loginUrl: string;
}

export function RespondentAuthRequiredCard({
  message = 'Sign in to access this survey and record your responses.',
  loginUrl,
}: RespondentAuthRequiredCardProps) {
  return (
    <Card className="max-w-lg mx-auto text-center border-[#E9DDE1] shadow-xs">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-[#F4E5EA] text-[#762D46] flex items-center justify-center mb-5">
        <Lock className="w-7 h-7 text-[#762D46]" aria-hidden="true" />
      </div>

      <CardHeader className="mb-4 space-y-2">
        <CardTitle className="text-xl sm:text-2xl font-bold text-[#30232A]">
          Authentication Required
        </CardTitle>
        <CardDescription className="text-sm text-[#75666D] leading-relaxed">
          {message}
        </CardDescription>
      </CardHeader>

      <div className="pt-2 flex justify-center">
        <Link href={loginUrl} className="w-full sm:w-auto">
          <Button variant="primary" size="md" className="w-full sm:w-auto gap-2">
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>Sign In to Participate</span>
          </Button>
        </Link>
      </div>
    </Card>
  );
}
