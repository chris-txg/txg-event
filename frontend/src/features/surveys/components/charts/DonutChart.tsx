'use client';

import React from 'react';

export interface DonutSegment {
  label: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface DonutChartProps {
  title?: string;
  total: number;
  centerLabel?: string;
  segments: DonutSegment[];
  className?: string;
}

const DEFAULT_COLORS = [
  '#762D46', // Deep burgundy
  '#A84A63', // Rose wine
  '#C9889E', // Dusty mauve
  '#E6C0CD', // Soft pink
  '#8E4D62', // Muted berry
  '#421827', // Dark wine
  '#D4BAC2', // Pale slate rose
];

export function DonutChart({
  title,
  total,
  centerLabel,
  segments,
  className = '',
}: DonutChartProps) {
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate cumulative offsets
  let cumulativePercentage = 0;

  const validSegments = segments.filter((s) => s.label && s.label.trim().length > 0);
  const totalCount = total > 0 ? total : validSegments.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className={`bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs flex flex-col justify-between ${className}`}>
      {title && (
        <h3 className="text-sm font-bold text-[#30232A] mb-5 tracking-tight">
          {title}
        </h3>
      )}

      {validSegments.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-stone-400 text-xs">
          No question choices configured
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto">
          {/* Circular Donut Ring */}
          <div className="relative w-[180px] h-[180px] shrink-0">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
            >
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#F1E8EC"
                strokeWidth={strokeWidth}
              />

              {/* Segment arcs (if totalCount > 0) */}
              {totalCount > 0 &&
                validSegments.map((segment, index) => {
                  const pct = segment.percentage > 0
                    ? segment.percentage
                    : (segment.count / totalCount) * 100;

                  const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
                  cumulativePercentage += pct;
                  const segmentColor = segment.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

                  return (
                    <circle
                      key={segment.label + index}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="transparent"
                      stroke={segmentColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="butt"
                      className="transition-all duration-500 ease-out"
                    />
                  );
                })}
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-[#30232A] tracking-tight">
                {totalCount.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider">
                {centerLabel || 'Responses'}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2.5 w-full sm:max-w-[210px]">
            {validSegments.map((segment, index) => {
              const segmentColor = segment.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
              const pct = totalCount > 0
                ? segment.percentage > 0
                  ? Math.round(segment.percentage)
                  : Math.round((segment.count / totalCount) * 100)
                : 0;

              return (
                <div
                  key={segment.label + index}
                  className="flex items-center justify-between text-xs text-[#52414A]"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: totalCount > 0 ? segmentColor : '#D4BAC2' }}
                    />
                    <span className="truncate text-stone-700 font-medium" title={segment.label}>
                      {segment.label}
                    </span>
                  </div>
                  <span className="font-bold text-[#30232A] shrink-0">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
