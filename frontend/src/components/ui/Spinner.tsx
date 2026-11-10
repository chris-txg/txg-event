import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div
      role="status"
      className={cn('flex items-center justify-center text-[#762D46]', className)}
      {...props}
    >
      <Loader2 className={cn('animate-spin', sizes[size])} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
