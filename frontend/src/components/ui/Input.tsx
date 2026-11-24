import React, { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Eye, EyeOff } from 'lucide-react';
import { preventNonNumericInput, preventNonPhoneInput } from '@/lib/utils/formValidation';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  required?: boolean;
  allowDecimal?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      startIcon,
      endIcon,
      showPasswordToggle = false,
      required = false,
      allowDecimal = false,
      id,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined);
    const isPasswordType = type === 'password' || showPasswordToggle;
    const computedType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    // Check if label ends with '*' or required prop is true
    const isRequired = required || (Boolean(label) && label!.trim().endsWith('*'));
    const cleanLabel = label ? label.replace(/\s*\*+\s*$/, '').trim() : '';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (type === 'number') {
        preventNonNumericInput(e, allowDecimal);
      } else if (type === 'tel') {
        preventNonPhoneInput(e);
      }
      if (onKeyDown) {
        onKeyDown(e);
      }
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
        <div className="relative flex items-center">
          {startIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#762D46]/60">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={computedType}
            aria-invalid={Boolean(error)}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#421827] placeholder:text-stone-400 transition-all duration-200 focus:outline-none disabled:bg-stone-50 disabled:cursor-not-allowed',
              startIcon && 'pl-10',
              (endIcon || isPasswordType) && 'pr-11',
              error
                ? 'border-rose-500 focus:border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-rose-900 placeholder:text-rose-300'
                : 'border-stone-200 focus:border-[#762D46] focus:ring-2 focus:ring-[#762D46]/20',
              className
            )}
            {...props}
          />
          {isPasswordType && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 p-1 rounded-lg text-stone-400 hover:text-[#762D46] transition-colors focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          {!isPasswordType && endIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-stone-400">
              {endIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{error}</p>}
        {!error && helperText && <p className="text-xs text-stone-500 mt-1 leading-tight">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
