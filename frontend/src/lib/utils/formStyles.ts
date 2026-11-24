import { cn } from '@/lib/utils/cn';

/**
 * Standard utility to generate classes for select, textarea, or custom input containers
 * with uniform red borders, ring highlights, and background tint on error.
 */
export function getFieldClass(hasError?: boolean, extraClasses?: string): string {
  return cn(
    'w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#30232A] transition-all duration-200 focus:outline-none disabled:bg-stone-50 disabled:cursor-not-allowed',
    hasError
      ? 'border-rose-500 focus:border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-rose-900'
      : 'border-[#E9DDE1] bg-[#FBF7F8] focus:border-[#762D46] focus:bg-white focus:ring-2 focus:ring-[#762D46]/20',
    extraClasses
  );
}

/**
 * Standard utility to generate classes for selectable cards (e.g. visibility radios, pricing cards)
 */
export function getSelectableCardClass(isSelected: boolean, hasError?: boolean, extraClasses?: string): string {
  return cn(
    'p-3.5 rounded-xl border cursor-pointer transition-all',
    hasError && !isSelected && 'border-rose-400 bg-rose-50/10',
    isSelected
      ? 'border-[#762D46] bg-[#F4E5EA]/30'
      : 'border-stone-200 hover:border-[#762D46]/40 bg-white',
    extraClasses
  );
}
