'use client';

import React from 'react';

export interface TimelineDataPoint {
  date: string; // e.g. "Oct 27" or ISO string
  count: number;
  label?: string;
}

export interface TimelineBarChartProps {
  title?: string;
  data: TimelineDataPoint[];
  className?: string;
}

export function TimelineBarChart({
  title = 'Survey responses over time',
  data,
  className = '',
}: TimelineBarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className={`bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs flex flex-col justify-between ${className}`}>
      {title && (
        <h3 className="text-sm font-bold text-[#30232A] mb-4 tracking-tight">
          {title}
        </h3>
      )}

      {data.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-stone-400 text-xs">
          No chronological timeline entries recorded yet
        </div>
      ) : (
        <div className="pt-2 my-auto">
          {/* Chart plot area */}
          <div className="h-36 flex items-end justify-between gap-2 sm:gap-3 border-b border-[#F0E6EA] pb-2">
            {data.map((item, index) => {
              const heightPct = Math.max(10, Math.round((item.count / maxCount) * 100));

              return (
                <div
                  key={item.date + index}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-0.5 bg-[#421827] text-white text-[10px] font-bold rounded-md pointer-events-none whitespace-nowrap z-10 shadow-sm">
                    {item.count} responses
                  </div>

                  {/* Vertical Bar */}
                  <div
                    className="w-full max-w-[28px] bg-[#762D46] hover:bg-[#5C2337] rounded-t-sm transition-all duration-500 ease-out cursor-pointer"
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 pt-2 text-[10px] text-stone-500 font-medium">
            {data.map((item, index) => (
              <span key={item.date + index} className="flex-1 text-center truncate">
                {item.label || item.date}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
