import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: readonly SelectOption[] | SelectOption[];
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, helperText, required = false, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined);

    const isRequired = required || (Boolean(label) && label!.trim().endsWith('*'));
    const cleanLabel = label ? label.replace(/\s*\*+\s*$/, '').trim() : '';

    return (
      <div className="w-full space-y-1.5 text-left">
        {cleanLabel && (
          <label
            htmlFor={selectId}
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
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            className={cn(
              'w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-[#421827] transition-all duration-200 focus:outline-none disabled:bg-stone-50 disabled:cursor-not-allowed',
              error
                ? 'border-rose-500 focus:border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-rose-900'
                : 'border-stone-200 focus:border-[#762D46] focus:ring-2 focus:ring-[#762D46]/20',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 pointer-events-none text-stone-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error && <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{error}</p>}
        {!error && helperText && <p className="text-xs text-stone-500 mt-1 leading-tight">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
