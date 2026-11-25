'use client';

import React, { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  COUNTRY_PHONE_RULES,
  DEFAULT_COUNTRY_DIAL_CODE,
  formatNationalPhone,
  getCountryRuleByDialCode,
  parsePhoneValue,
} from '@/lib/utils/phoneValidation';

export interface PhoneInputProps {
  label?: string;
  value?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function PhoneInput({
  label,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  disabled = false,
  id,
  name,
}: PhoneInputProps) {
  const parsed = parsePhoneValue(value);
  const [dialCode, setDialCode] = useState<string>(parsed.dialCode || DEFAULT_COUNTRY_DIAL_CODE);
  const [national, setNational] = useState<string>(parsed.nationalFormatted);

  // Sync internal state when external value changes (e.g. form reset or initial data load)
  useEffect(() => {
    const next = parsePhoneValue(value);
    if (value) {
      setDialCode(next.dialCode);
      setNational(next.nationalFormatted);
    } else {
      setNational('');
    }
  }, [value]);

  const rule = getCountryRuleByDialCode(dialCode);
  const inputId =
    id ||
    (label
      ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : 'phone-input');

  const isRequired = required || (Boolean(label) && label!.trim().endsWith('*'));
  const cleanLabel = label ? label.replace(/\s*\*+\s*$/, '').trim() : '';

  const emitValue = (nextDial: string, nextNationalFormatted: string) => {
    const digits = nextNationalFormatted.replace(/\D/g, '');
    if (!digits) {
      onChange('');
    } else {
      onChange(`${nextDial} ${nextNationalFormatted}`);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDial = e.target.value;
    setDialCode(newDial);
    const reformatted = formatNationalPhone(national, newDial);
    setNational(reformatted);
    emitValue(newDial, reformatted);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const reformatted = formatNationalPhone(e.target.value, dialCode);
    setNational(reformatted);
    emitValue(dialCode, reformatted);
  };

  return (
    <div className="w-full space-y-1.5 text-left">
      {cleanLabel && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-[#421827]/80"
        >
          <span>{cleanLabel}</span>
          {isRequired && (
            <span className="text-rose-500 font-bold ml-1 text-sm leading-none" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div
        className={cn(
          'flex items-stretch w-full rounded-xl border bg-white transition-all duration-200 overflow-hidden',
          disabled && 'bg-stone-50 cursor-not-allowed opacity-75',
          error
            ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
            : 'border-stone-200 focus-within:border-[#762D46] focus-within:ring-2 focus-within:ring-[#762D46]/20'
        )}
      >
        <div className="relative flex items-center border-r border-stone-200 bg-stone-50/70 shrink-0">
          <select
            aria-label="Country code"
            value={dialCode}
            onChange={handleCountryChange}
            disabled={disabled}
            className="h-full bg-transparent pl-3 pr-2 py-2.5 text-xs sm:text-sm font-semibold text-[#421827] focus:outline-none cursor-pointer disabled:cursor-not-allowed"
          >
            {COUNTRY_PHONE_RULES.map((country) => (
              <option key={country.code} value={country.dialCode}>
                {country.code} ({country.dialCode})
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 flex items-center">
          <div className="absolute left-3 flex items-center pointer-events-none text-[#762D46]/60">
            <Phone className="h-4 w-4" />
          </div>
          <input
            id={inputId}
            name={name}
            type="tel"
            inputMode="numeric"
            value={national}
            onChange={handleNumberChange}
            onBlur={onBlur}
            disabled={disabled}
            placeholder={rule.placeholder}
            aria-invalid={Boolean(error)}
            className={cn(
              'w-full bg-transparent pl-9 pr-3.5 py-2.5 text-sm text-[#421827] placeholder:text-stone-400 focus:outline-none disabled:cursor-not-allowed',
              error && 'text-rose-900 placeholder:text-rose-300'
            )}
          />
        </div>
      </div>

      {error && <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{error}</p>}
      {!error && helperText && <p className="text-xs text-stone-500 mt-1 leading-tight">{helperText}</p>}
    </div>
  );
}
