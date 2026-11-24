'use client';

import React from 'react';

export interface HorizontalBarItem {
  label: string;
  count?: number;
  percentage: number;
  color?: string;
}

export interface HorizontalBarChartProps {
  title?: string;
  subtitle?: string;
  items: HorizontalBarItem[];
  className?: string;
}

export function HorizontalBarChart({
  title,
  subtitle,
  items,
  className = '',
}: HorizontalBarChartProps) {
  const validItems = items.filter((item) => item.label && item.label.trim().length > 0);

  return (
    <div className={`bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs flex flex-col justify-between ${className}`}>
      <div>
        {title && (
          <h3 className="text-sm font-bold text-[#30232A] tracking-tight">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {validItems.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-stone-400 text-xs">
          No distribution data available
        </div>
      ) : (
        <div className="space-y-4 my-auto pt-4">
          {validItems.map((item, index) => {
            const pct = Math.min(100, Math.max(0, item.percentage));
            const barColor = item.color || '#762D46';

            return (
              <div key={item.label + index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#483B42] truncate pr-3" title={item.label}>
                    {item.label}
                  </span>
                  <span className="font-bold text-[#30232A] shrink-0">
                    {Math.round(pct)}%
                  </span>
                </div>

                {/* Bar Track & Fill */}
                <div className="w-full bg-[#EFE8EA] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
