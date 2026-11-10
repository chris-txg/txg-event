import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { MailCheck, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Verify Your Email — Event Manager',
  description: 'Email verification instructions for your Event Manager account.',
};

export default function VerifyEmailPage() {
  return (
    <Card className="w-full">
      <CardHeader className="text-center sm:text-left">
        <div className="w-12 h-12 rounded-2xl bg-[#F4E5EA] text-[#762D46] grid place-items-center mb-3">
          <MailCheck className="h-6 w-6" />
        </div>
        <CardTitle>Check Your Inbox</CardTitle>
        <CardDescription>
          We have dispatched an email confirmation message to verify your address.
        </CardDescription>
      </CardHeader>

      <div className="space-y-4">
        <Alert variant="info" title="Verification Instructions">
          Click the verification link provided in your email to activate full platform capabilities. If you do not see the message, please check your spam folder.
        </Alert>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link href="/login" className="flex-1">
            <Button variant="primary" size="md" className="w-full">
              <span>Sign In to Dashboard</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" size="md" className="w-full">
              <span>Return Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
