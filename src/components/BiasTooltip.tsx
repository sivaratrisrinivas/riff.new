import { useState } from 'react';
import type { Bias } from '../types';

interface BiasTooltipProps {
  bias: Bias;
  position: { top: number; left: number };
}

export function BiasTooltip({ bias, position }: BiasTooltipProps) {
  const formatBiasType = (type: string): string => {
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div
      className="absolute z-50 glass-panel rounded-lg p-3 border border-amber-500/30 shadow-lg max-w-xs"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-100%)',
        marginTop: '-8px',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          {formatBiasType(bias.type)}
        </span>
      </div>
      <p className="text-xs text-gray-300 leading-relaxed">
        {bias.explanation}
      </p>
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-500/30"></div>
    </div>
  );
}

