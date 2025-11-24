import { PERSONAS } from '../lib/personas';
import type { Persona } from '../types';

interface PersonaBarProps {
  selectedPersonas: string[];
  onTogglePersona: (personaId: string) => void;
  autoMode: boolean;
  onToggleAutoMode: () => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  textLength?: number;
  biasMode?: boolean;
  onToggleBiasMode?: () => void;
  hasBiases?: boolean;
}

function estimateTokens(textLength: number, personaCount: number): number {
  // Rough estimate: ~4 chars per token, prompt overhead ~200 tokens, response ~100 tokens per persona
  const inputTokens = Math.ceil(textLength / 4);
  const promptOverhead = 200;
  const responseTokens = personaCount * 100;
  return inputTokens + promptOverhead + responseTokens;
}

export function PersonaBar({
  selectedPersonas,
  onTogglePersona,
  autoMode,
  onToggleAutoMode,
  onAnalyze,
  isAnalyzing = false,
  textLength = 0,
  biasMode = false,
  onToggleBiasMode,
  hasBiases = false,
}: PersonaBarProps) {
  const estimatedTokens = textLength > 0 ? estimateTokens(textLength, selectedPersonas.length || 1) : 0;
  const getPersonaColor = (persona: Persona) => {
    switch (persona.color) {
      case 'cyan':
        return 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300';
      case 'rose':
        return 'bg-rose-500/20 border-rose-500/30 text-rose-300';
      case 'violet':
        return 'bg-violet-500/20 border-violet-500/30 text-violet-300';
      case 'purple':
        return 'bg-purple-500/20 border-purple-500/30 text-purple-300';
      default:
        return 'bg-gray-500/20 border-gray-500/30 text-gray-300';
    }
  };

  const getPersonaColorSelected = (persona: Persona) => {
    switch (persona.color) {
      case 'cyan':
        return 'bg-cyan-500/30 border-cyan-500/50 text-cyan-200';
      case 'rose':
        return 'bg-rose-500/30 border-rose-500/50 text-rose-200';
      case 'violet':
        return 'bg-violet-500/30 border-violet-500/50 text-violet-200';
      case 'purple':
        return 'bg-purple-500/30 border-purple-500/50 text-purple-200';
      default:
        return 'bg-gray-500/30 border-gray-500/50 text-gray-200';
    }
  };

  return (
    <div className="flex-none px-6 py-4 border-b border-white/5 flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {PERSONAS.map((persona) => {
          const isSelected = selectedPersonas.includes(persona.id);
          return (
            <button
              key={persona.id}
              onClick={() => onTogglePersona(persona.id)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium
                border transition-all duration-200
                ${isSelected 
                  ? getPersonaColorSelected(persona) + ' shadow-lg' 
                  : getPersonaColor(persona) + ' hover:opacity-80'
                }
              `}
              title={persona.description}
            >
              {persona.name}
            </button>
          );
        })}
      </div>
      
      <div className="flex items-center gap-3 ml-auto">
        {onToggleBiasMode && (
          <button
            onClick={onToggleBiasMode}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium
              border transition-all duration-200
              ${biasMode
                ? hasBiases 
                  ? 'bg-amber-500/30 border-amber-500/50 text-amber-200 shadow-lg'
                  : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }
            `}
            title="Detect cognitive biases"
          >
            {biasMode ? (hasBiases ? '🧠 Biases Found' : '🧠 Biases On') : 'Biases'}
          </button>
        )}
        
        <button
          onClick={onToggleAutoMode}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-medium
            border transition-all duration-200
            ${autoMode
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }
          `}
        >
          {autoMode ? 'Auto' : 'Manual'}
        </button>
        
        {!autoMode && selectedPersonas.length > 0 && (
          <div className="flex items-center gap-3">
            {estimatedTokens > 0 && (
              <span className="text-xs text-gray-500">
                ~{estimatedTokens} tokens
              </span>
            )}
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing || textLength < 10}
              className={`
                px-4 py-1.5 rounded-lg text-xs font-medium
                bg-cyan-500/20 border border-cyan-500/30 text-cyan-300
                hover:bg-cyan-500/30 hover:border-cyan-500/50
                transition-all duration-200
                ${isAnalyzing || textLength < 10 ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

