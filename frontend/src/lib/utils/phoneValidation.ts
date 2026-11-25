export interface CountryPhoneRule {
  code: string;
  dialCode: string;
  name: string;
  minDigits: number;
  maxDigits: number;
  /** Digit group sizes for automatic spacing (e.g. [5, 5] -> XXXXX XXXXX) */
  groups: number[];
  placeholder: string;
}

export const COUNTRY_PHONE_RULES: CountryPhoneRule[] = [
  { code: 'IN', dialCode: '+91', name: 'India', minDigits: 10, maxDigits: 10, groups: [5, 5], placeholder: '98765 43210' },
  { code: 'US', dialCode: '+1', name: 'United States / Canada', minDigits: 10, maxDigits: 10, groups: [3, 3, 4], placeholder: '555 000 0000' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', minDigits: 10, maxDigits: 10, groups: [4, 6], placeholder: '7911 123456' },
  { code: 'AE', dialCode: '+971', name: 'UAE', minDigits: 9, maxDigits: 9, groups: [2, 3, 4], placeholder: '50 123 4567' },
  { code: 'SG', dialCode: '+65', name: 'Singapore', minDigits: 8, maxDigits: 8, groups: [4, 4], placeholder: '8123 4567' },
  { code: 'AU', dialCode: '+61', name: 'Australia', minDigits: 9, maxDigits: 9, groups: [3, 3, 3], placeholder: '412 345 678' },
  { code: 'DE', dialCode: '+49', name: 'Germany', minDigits: 10, maxDigits: 11, groups: [3, 8], placeholder: '151 23456789' },
  { code: 'FR', dialCode: '+33', name: 'France', minDigits: 9, maxDigits: 9, groups: [1, 2, 2, 2, 2], placeholder: '6 12 34 56 78' },
  { code: 'JP', dialCode: '+81', name: 'Japan', minDigits: 10, maxDigits: 10, groups: [2, 4, 4], placeholder: '90 1234 5678' },
  { code: 'CN', dialCode: '+86', name: 'China', minDigits: 11, maxDigits: 11, groups: [3, 4, 4], placeholder: '138 0013 8000' },
  { code: 'SA', dialCode: '+966', name: 'Saudi Arabia', minDigits: 9, maxDigits: 9, groups: [2, 3, 4], placeholder: '50 123 4567' },
  { code: 'QA', dialCode: '+974', name: 'Qatar', minDigits: 8, maxDigits: 8, groups: [4, 4], placeholder: '3312 3456' },
  { code: 'MY', dialCode: '+60', name: 'Malaysia', minDigits: 9, maxDigits: 10, groups: [2, 4, 4], placeholder: '12 345 6789' },
];

export const DEFAULT_COUNTRY_DIAL_CODE = '+91';

export function getCountryRuleByDialCode(dialCode?: string): CountryPhoneRule {
  return (
    COUNTRY_PHONE_RULES.find((c) => c.dialCode === dialCode) ||
    COUNTRY_PHONE_RULES[0]
  );
}

/**
 * Strips non-digits, truncates to the country's maxDigits, and inserts spaces
 * according to the country's grouping pattern (e.g. +91 -> XXXXX XXXXX).
 */
export function formatNationalPhone(rawDigits: string, dialCode: string): string {
  const rule = getCountryRuleByDialCode(dialCode);
  const digits = rawDigits.replace(/\D/g, '').slice(0, rule.maxDigits);

  if (!digits) return '';

  const parts: string[] = [];
  let cursor = 0;
  for (const size of rule.groups) {
    if (cursor >= digits.length) break;
    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }
  if (cursor < digits.length) {
    parts.push(digits.slice(cursor));
  }

  return parts.join(' ');
}

/**
 * Splits a stored phone value (e.g. "+91 98765 43210") into dialCode and formatted national number.
 * Defaults to +91 if no matching dial code prefix is found.
 */
export function parsePhoneValue(value?: string | null): {
  dialCode: string;
  nationalFormatted: string;
} {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return { dialCode: DEFAULT_COUNTRY_DIAL_CODE, nationalFormatted: '' };
  }

  // Match longest dial code first so +971 matches before +9, etc.
  const sortedRules = [...COUNTRY_PHONE_RULES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  for (const rule of sortedRules) {
    if (trimmed.startsWith(rule.dialCode)) {
      const rest = trimmed.slice(rule.dialCode.length).trim();
      return {
        dialCode: rule.dialCode,
        nationalFormatted: formatNationalPhone(rest, rule.dialCode),
      };
    }
  }

  return {
    dialCode: DEFAULT_COUNTRY_DIAL_CODE,
    nationalFormatted: formatNationalPhone(trimmed, DEFAULT_COUNTRY_DIAL_CODE),
  };
}

/**
 * Validates a full phone value ("+91 98765 43210") against its selected country's digit rules.
 * Empty values are allowed (optional field); use required/min in schema if mandatory.
 */
export function validateCountryPhone(value?: string | null): {
  valid: boolean;
  message?: string;
} {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return { valid: true };
  }

  const { dialCode, nationalFormatted } = parsePhoneValue(trimmed);
  const rule = getCountryRuleByDialCode(dialCode);
  const digitCount = nationalFormatted.replace(/\D/g, '').length;

  if (digitCount === 0) {
    return { valid: true };
  }

  if (digitCount < rule.minDigits || digitCount > rule.maxDigits) {
    const expected =
      rule.minDigits === rule.maxDigits
        ? `${rule.minDigits} digits`
        : `${rule.minDigits}-${rule.maxDigits} digits`;
    return {
      valid: false,
      message: `${rule.name} (${rule.dialCode}) phone numbers must be ${expected}`,
    };
  }

  return { valid: true };
}
