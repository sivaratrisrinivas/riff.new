import type { Insight } from '../types';

interface CardProps {
  insight: Insight;
}

export function Card({ insight }: CardProps) {
  const typeColors = {
    'counter-argument': 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/30',
    'question': 'border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/30',
    'lateral-prompt': 'border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/30',
  };

  const typeTextColors = {
    'counter-argument': 'text-rose-300',
    'question': 'text-cyan-300',
    'lateral-prompt': 'text-violet-300',
  };

  const typeLabels = {
    'counter-argument': 'Counterpoint',
    'question': 'Deep Dive',
    'lateral-prompt': 'Lateral Move',
  };

  return (
    <div
      className={`
        group relative overflow-hidden
        backdrop-blur-md rounded-xl p-5 mb-4
        border transition-all duration-500 ease-out
        hover:scale-[1.02] hover:shadow-lg
        animate-fade-in-up
        ${typeColors[insight.type]}
      `}
    >
      {/* Glowing accent line */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${typeTextColors[insight.type].replace('text', 'bg')} opacity-40 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="flex items-center gap-2 mb-3 pl-3">
        <span className={`text-xs font-bold uppercase tracking-widest ${typeTextColors[insight.type]} opacity-70 group-hover:opacity-100 transition-opacity`}>
          {typeLabels[insight.type]}
        </span>
      </div>
      
      <p className="text-gray-200 text-base leading-relaxed pl-3 font-light tracking-wide group-hover:text-white transition-colors">
        {insight.content}
      </p>
    </div>
  );
}
