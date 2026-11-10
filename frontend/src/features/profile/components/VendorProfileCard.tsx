'use client';

import React from 'react';
import { VendorProfile } from '@/features/authentication/types/auth.types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Store, MapPin, Tag, Star, ShieldCheck, Clock, XCircle } from 'lucide-react';

interface VendorProfileCardProps {
  profile: VendorProfile;
}

export function VendorProfileCard({ profile }: VendorProfileCardProps) {
  const getStatusDisplay = () => {
    switch (profile.verification_status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Verified Vendor</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>Application Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Under Review</span>
          </span>
        );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Vendor Business Profile</CardTitle>
            <CardDescription>
              Public listing and verification metrics
            </CardDescription>
          </div>
          <div>{getStatusDisplay()}</div>
        </div>
      </CardHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-stone-50 border border-stone-200">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-[#762D46]" />
              Business Name
            </span>
            <span className="text-sm font-bold text-[#421827] mt-1 block">
              {profile.business_name}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-[#762D46]" />
              Service Category
            </span>
            <span className="text-sm font-bold text-[#762D46] mt-1 block">
              {profile.business_category}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#762D46]" />
              Operating City
            </span>
            <span className="text-sm font-medium text-[#421827] mt-1 block">
              {profile.city}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Customer Rating
            </span>
            <span className="text-sm font-bold text-[#421827] mt-1 block">
              {profile.rating ? `${profile.rating} / 5.0` : 'No ratings yet'}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
              Total Reviews
            </span>
            <span className="text-sm font-bold text-[#421827] mt-1 block">
              {profile.total_reviews ?? 0} reviews
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
              Marketplace Status
            </span>
            <span className="text-sm font-bold text-emerald-700 mt-1 block">
              {profile.is_available ?? true ? 'Active & Available' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
