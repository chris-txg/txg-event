import React from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
}

export function Alert({
  variant = 'error',
  title,
  children,
  className,
  ...props
}: AlertProps) {
  const icons = {
    error: <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />,
    success: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />,
    warning: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />,
    info: <Info className="h-5 w-5 shrink-0 text-[#762D46]" />,
  };

  const variants = {
    error: 'bg-rose-50 border-rose-200 text-rose-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    info: 'bg-[#F4E5EA]/70 border-[#762D46]/20 text-[#421827]',
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-4 text-sm transition-all',
        variants[variant],
        className
      )}
      {...props}
    >
      <div className="mt-0.5">{icons[variant]}</div>
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}
