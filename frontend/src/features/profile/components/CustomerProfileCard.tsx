'use client';

import React, { useState } from 'react';
import { CustomerProfile } from '@/features/authentication/types/auth.types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Building2, FileText, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { bffFetch } from '@/lib/api/bff-client';
import { BFF_ENDPOINTS } from '@/config/endpoints';

interface CustomerProfileCardProps {
  profile: CustomerProfile;
  onProfileUpdated: () => void;
}

export function CustomerProfileCard({ profile, onProfileUpdated }: CustomerProfileCardProps) {
  const isB2B = profile.customer_type === 'B2B';

  const [isUpgrading, setIsUpgrading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [city, setCity] = useState(profile.city || '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!companyName.trim()) {
      setError('Company name is required for corporate accounts.');
      return;
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(gstNumber.trim().toUpperCase())) {
      setError('Please enter a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5).');
      return;
    }

    setLoading(true);
    try {
      const res = await bffFetch(BFF_ENDPOINTS.AUTH.PROFILE_CUSTOMER, {
        method: 'PATCH',
        body: JSON.stringify({
          customer_type: 'B2B',
          company_name: companyName.trim(),
          gst_number: gstNumber.trim().toUpperCase(),
          city: city.trim() || null,
        }),
      });

      if (!res.ok) {
        setError('Failed to upgrade account. Please check your GSTIN and company details.');
        return;
      }

      setSuccess('Successfully upgraded to a Corporate (B2B) account!');
      setIsUpgrading(false);
      onProfileUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error during upgrade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Organizer Profile</CardTitle>
        <CardDescription>
          Account tier and business configuration
        </CardDescription>
      </CardHeader>

      {success && (
        <div className="mb-4">
          <Alert variant="success" title="Profile Updated">
            {success}
          </Alert>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Update Error">
            {error}
          </Alert>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
              Organizer Type
            </span>
            <span className="text-sm font-bold text-[#421827] mt-0.5 block">
              {isB2B ? 'Corporate Account (B2B)' : 'Individual / Personal (B2C)'}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
              Primary City
            </span>
            <span className="text-sm font-medium text-[#421827] mt-0.5 block">
              {profile.city || 'Not specified'}
            </span>
          </div>

          {isB2B && (
            <>
              <div>
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                  Company Name
                </span>
                <span className="text-sm font-bold text-[#421827] mt-0.5 block">
                  {profile.company_name}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                  GSTIN
                </span>
                <span className="text-sm font-mono font-bold text-[#762D46] mt-0.5 block">
                  {profile.gst_number}
                </span>
              </div>
            </>
          )}
        </div>

        {/* B2C to B2B upgrade banner */}
        {!isB2B && !isUpgrading && (
          <div className="p-5 rounded-2xl border border-[#762D46]/20 bg-[#F4E5EA]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#762D46] mb-1">
                <Sparkles className="h-4 w-4" />
                <span>Need Corporate Invoicing & GST Credit?</span>
              </div>
              <p className="text-xs text-stone-600">
                Upgrade your account to Corporate (B2B) to manage organizational summits and claim input tax credit.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUpgrading(true)}
              className="shrink-0"
            >
              <span>Upgrade to B2B</span>
            </Button>
          </div>
        )}

        {/* Upgrade Form */}
        {!isB2B && isUpgrading && (
          <form onSubmit={handleUpgrade} className="space-y-4 p-5 rounded-2xl border border-[#762D46]/30 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#421827] text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#762D46]" />
                <span>Upgrade to Corporate (B2B)</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsUpgrading(false)}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Registered Company Name"
                placeholder="Acme Global Events Ltd"
                startIcon={<Building2 className="h-4 w-4" />}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <Input
                label="GSTIN (15 Digits)"
                placeholder="29ABCDE1234F1Z5"
                startIcon={<FileText className="h-4 w-4" />}
                className="uppercase"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                required
              />
            </div>

            <Input
              label="City"
              placeholder="Mumbai"
              startIcon={<MapPin className="h-4 w-4" />}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsUpgrading(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={loading}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                <span>Confirm Upgrade</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
