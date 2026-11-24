import React from 'react';

/**
 * Valid Indian GSTIN format (15 characters: 2 digits, 5 uppercase letters, 4 digits, 1 letter, 1 alphanumeric, 'Z', 1 alphanumeric)
 * Exactly mirrors backend accounts.validators.GST_REGEX.
 */
export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Valid Indian PAN format (10 characters: 5 uppercase letters, 4 digits, 1 uppercase letter)
 * Exactly mirrors backend accounts.validators.PAN_REGEX.
 */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * Valid international phone number format: allows leading '+', spaces, hyphens, parentheses, and 7-15 digits.
 */
export const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

/**
 * Validates whether a GSTIN string matches the official 15-character structure.
 */
export function isValidGSTIN(value?: string | null): boolean {
  if (!value) return false;
  return GST_REGEX.test(value.trim().toUpperCase());
}

/**
 * Validates whether a PAN string matches the official 10-character structure.
 */
export function isValidPAN(value?: string | null): boolean {
  if (!value) return false;
  return PAN_REGEX.test(value.trim().toUpperCase());
}

/**
 * Prevents invalid keys from being typed into numeric inputs.
 * Blocks 'e', 'E', '+', '-', and non-digit characters while preserving navigation and editing shortcuts.
 * 
 * @param e - React KeyboardEvent on HTMLInputElement
 * @param allowDecimal - Whether to allow a single decimal point (e.g. for budget currency amounts)
 */
export function preventNonNumericInput(
  e: React.KeyboardEvent<HTMLInputElement>,
  allowDecimal = false
) {
  // Allow navigation, deletion, clipboard shortcuts
  const allowedKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ];

  if (allowedKeys.includes(e.key)) return;

  // Allow copy/paste/select-all shortcuts (Ctrl/Cmd + A, C, V, X)
  if (e.ctrlKey || e.metaKey) return;

  // Allow decimal point if requested and not already present
  if (allowDecimal && e.key === '.') {
    if ((e.currentTarget.value || '').includes('.')) {
      e.preventDefault();
    }
    return;
  }

  // Reject non-digits
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
}

/**
 * Prevents non-phone characters from being typed into phone/tel inputs.
 * Allows digits (0-9), '+', '-', '(', ')', space, and navigation/clipboard keys.
 * Blocks alphabetic characters and disallowed symbols.
 */
export function preventNonPhoneInput(e: React.KeyboardEvent<HTMLInputElement>) {
  const allowedKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ];

  if (allowedKeys.includes(e.key)) return;
  if (e.ctrlKey || e.metaKey) return;

  // Allow '+', '-', '(', ')', and space
  if (['+', '-', '(', ')', ' '].includes(e.key)) {
    return;
  }

  // Reject non-digits
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
}

/**
 * Sanitizes numeric input on paste or change.
 */
export function sanitizeNumericString(value: string, allowDecimal = false): string {
  if (!value) return '';
  if (allowDecimal) {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return `${parts[0]}.${parts.slice(1).join('')}`;
    }
    return cleaned;
  }
  return value.replace(/\D/g, '');
}

/**
 * Returns today's local date in YYYY-MM-DD format for date input min boundaries.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Returns the current local date and time in YYYY-MM-DDTHH:MM format for datetime-local input min boundaries.
 */
export function getNowDateTimeLocalString(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * Traverses React Hook Form FieldErrors or custom error map to find the first error field key.
 */
export function getFirstErrorKey(errors: Record<string, unknown>): string | null {
  if (!errors || typeof errors !== 'object') return null;
  const keys = Object.keys(errors);
  if (keys.length === 0) return null;

  for (const key of keys) {
    const val = errors[key];
    if (val && typeof val === 'object' && !('message' in val)) {
      const nestedKey = getFirstErrorKey(val as Record<string, unknown>);
      if (nestedKey) return `${key}.${nestedKey}`;
    }
    return key;
  }
  return null;
}

/**
 * Finds the topmost invalid element in the DOM and smoothly scrolls to it with an offset
 * ensuring it is not obstructed by sticky headers, then shifts focus to it.
 *
 * @param errors - React Hook Form errors object or generic field error dictionary
 * @param container - Optional container element to scope element querying
 */
export function scrollToFirstFormError(
  errors: Record<string, unknown>,
  container?: HTMLElement | Document | null
): boolean {
  if (typeof window === 'undefined') return false;

  const root = container || document;
  const firstKey = getFirstErrorKey(errors);

  let targetEl: HTMLElement | null = null;

  if (firstKey) {
    // 1. Try finding input by exact name
    targetEl = root.querySelector(`[name="${firstKey}"]`);

    // 2. Try finding input by exact id
    if (!targetEl) {
      targetEl = root.querySelector(`#${firstKey}`);
    }

    // 3. Try finding by data-field-name or aria-labelledby
    if (!targetEl) {
      targetEl = root.querySelector(`[data-field="${firstKey}"]`);
    }
  }

  // 4. Fallback: query any element marked aria-invalid="true" or with .has-error
  if (!targetEl) {
    targetEl = root.querySelector('[aria-invalid="true"], .border-rose-500, [data-invalid="true"]');
  }

  if (targetEl) {
    // Calculate position with a 100px buffer for sticky dashboard header
    const rect = targetEl.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetTop = rect.top + scrollTop - 110;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });

    // Focus target element or its inner input after a tiny tick
    setTimeout(() => {
      if (targetEl) {
        if (typeof targetEl.focus === 'function') {
          targetEl.focus({ preventScroll: true });
        } else {
          const focusable = targetEl.querySelector<HTMLElement>('input, select, textarea, button, [tabindex="0"]');
          if (focusable) {
            focusable.focus({ preventScroll: true });
          }
        }
      }
    }, 150);

    return true;
  }

  return false;
}

/**
 * Standard CSS classes for form inputs with validation state.
 */
export const FORM_INPUT_BASE =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#421827] placeholder:text-stone-400 transition-all duration-200 focus:outline-none disabled:bg-stone-50 disabled:cursor-not-allowed';

export const FORM_INPUT_VALID =
  'border-stone-200 focus:border-[#762D46] focus:ring-2 focus:ring-[#762D46]/20';

export const FORM_INPUT_INVALID =
  'border-rose-500 focus:border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-rose-900';
