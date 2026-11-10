import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Calendar, Building2, Store, ArrowRight } from 'lucide-react';

export function RoleSelector() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Join Event Manager</CardTitle>
        <CardDescription>
          Choose how you want to experience and use the platform
        </CardDescription>
      </CardHeader>

      <div className="space-y-4">
        {/* Customer option */}
        <Link
          href="/register/customer"
          className="group block p-5 rounded-2xl border border-stone-200 hover:border-[#762D46] hover:bg-[#F4E5EA]/20 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F4E5EA] text-[#762D46] grid place-items-center shrink-0 group-hover:bg-[#762D46] group-hover:text-white transition-colors">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#421827] text-base group-hover:text-[#762D46] transition-colors">
                  Event Organizer
                </h3>
                <ArrowRight className="h-4 w-4 text-stone-400 group-hover:text-[#762D46] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Plan personal weddings, birthdays, parties or corporate summits and conferences.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#762D46] bg-[#F4E5EA] px-2 py-0.5 rounded-full">
                  Individual (B2C)
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#762D46] bg-[#F4E5EA] px-2 py-0.5 rounded-full">
                  <Building2 className="h-3 w-3" />
                  Corporate (B2B)
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Vendor option */}
        <Link
          href="/register/vendor"
          className="group block p-5 rounded-2xl border border-stone-200 hover:border-[#762D46] hover:bg-[#F4E5EA]/20 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F4E5EA] text-[#762D46] grid place-items-center shrink-0 group-hover:bg-[#762D46] group-hover:text-white transition-colors">
              <Store className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#421827] text-base group-hover:text-[#762D46] transition-colors">
                  Service Vendor & Provider
                </h3>
                <ArrowRight className="h-4 w-4 text-stone-400 group-hover:text-[#762D46] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Offer venues, catering, photography, AV, décor, security, and entertainment to event planners.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#762D46] bg-[#F4E5EA] px-2 py-0.5 rounded-full">
                  9 Verified Categories
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="pt-6 mt-6 text-center text-xs text-stone-500 border-t border-stone-100">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-bold text-[#762D46] hover:text-[#A84A63] underline underline-offset-4 transition-colors"
        >
          Sign in here
        </Link>
      </div>
    </Card>
  );
}
