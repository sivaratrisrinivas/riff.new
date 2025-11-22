import { useState, useEffect } from 'react';
import { Card } from './Card';
import type { Insight } from '../types';
import { PERSONAS } from '../lib/personas';

interface InsightsProps {
  text: string;
  ws: WebSocket | null;
  personas: string[];
  autoMode: boolean;
  onInsightsChange?: (insights: Insight[]) => void;
  onAnalyzingChange?: (isAnalyzing: boolean) => void;
}

export function Insights({ text, ws, personas, autoMode, onInsightsChange, onAnalyzingChange }: InsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [bandInsights, setBandInsights] = useState<Record<string, Insight[]>>({});
  const [streamingTexts, setStreamingTexts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!text || text.length < 10 || !ws) {
      setInsights([]);
      setBandInsights({});
      setStreamingTexts({});
      setIsLoadingPersonas({});
      setIsLoading(false);
      // Use setTimeout to avoid updating parent during render
      if (onInsightsChange) {
        setTimeout(() => onInsightsChange([]), 0);
      }
      return;
    }

    // Auto mode: trigger analysis automatically
    if (autoMode) {
      if (personas.length > 0) {
        setIsLoading(true);
        setIsLoadingPersonas(Object.fromEntries(personas.map(p => [p, true])));
        setStreamingTexts({});
        setBandInsights({});
        setInsights([]);
        // Use setTimeout to avoid updating parent during render
        if (onInsightsChange) {
          setTimeout(() => onInsightsChange([]), 0);
        }
        if (onAnalyzingChange) {
          setTimeout(() => onAnalyzingChange(true), 0);
        }

        ws.send(JSON.stringify({ 
          type: 'analyze', 
          text,
          personas,
          fp: '', // Will be computed server-side
        }));
      } else {
        // Single persona mode (backward compatible)
        setIsLoading(true);
        setStreamingTexts({});
        setBandInsights({});
        setInsights([]);
        // Use setTimeout to avoid updating parent during render
        if (onInsightsChange) {
          setTimeout(() => onInsightsChange([]), 0);
        }
        if (onAnalyzingChange) {
          setTimeout(() => onAnalyzingChange(true), 0);
        }

        ws.send(JSON.stringify({ type: 'analyze', text }));
      }
    }
  }, [text, ws, personas, autoMode]);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'stream') {
        if (data.personaId) {
          // Band mode streaming
          setIsLoading(true);
          setIsLoadingPersonas((prev) => ({ ...prev, [data.personaId]: true }));
          if (onAnalyzingChange) {
            setTimeout(() => onAnalyzingChange(true), 0);
          }
          setStreamingTexts((prev) => ({
            ...prev,
            [data.personaId]: (prev[data.personaId] || '') + data.chunk,
          }));
        } else {
          // Single mode streaming (backward compatible)
          setIsLoading(true);
          if (onAnalyzingChange) {
            setTimeout(() => onAnalyzingChange(true), 0);
          }
          setStreamingTexts((prev) => ({
            ...prev,
            _single: (prev._single || '') + data.chunk,
          }));
        }
      } else if (data.type === 'complete') {
        if (data.personaId) {
          // Band mode complete
          setIsLoadingPersonas((prev) => {
            const updated = { ...prev, [data.personaId]: false };
            // Check if all personas are done
            const allDone = personas.every(pid => !updated[pid]);
            if (allDone && onAnalyzingChange) {
              setTimeout(() => onAnalyzingChange(false), 0);
            }
            return updated;
          });
          setBandInsights((prev) => {
            const updated = {
              ...prev,
              [data.personaId]: data.insights || [],
            };
            // Collect all insights for onInsightsChange
            const allInsights = Object.values(updated).flat();
            if (onInsightsChange) {
              setTimeout(() => onInsightsChange(allInsights), 0);
            }
            return updated;
          });
          setStreamingTexts((prev) => {
            const next = { ...prev };
            delete next[data.personaId];
            return next;
          });
        } else {
          // Single mode complete
          setIsLoading(false);
          if (onAnalyzingChange) {
            setTimeout(() => onAnalyzingChange(false), 0);
          }
          if (data.insights) {
            setInsights(data.insights);
            if (onInsightsChange) {
              setTimeout(() => onInsightsChange(data.insights), 0);
            }
          }
          setStreamingTexts((prev) => {
            const next = { ...prev };
            delete next._single;
            return next;
          });
        }
      } else if (data.type === 'cache-hit') {
        // Cache hit - insights will come via complete messages
        setIsLoading(false);
        setIsLoadingPersonas(Object.fromEntries(personas.map(p => [p, false])));
        if (onAnalyzingChange) {
          setTimeout(() => onAnalyzingChange(false), 0);
        }
      } else if (data.type === 'error') {
        setIsLoading(false);
        setIsLoadingPersonas({});
        setStreamingTexts({});
        if (onAnalyzingChange) {
          setTimeout(() => onAnalyzingChange(false), 0);
        }
        console.error('AI error:', data.error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, personas]);

  const hasAnyLoading = Object.values(isLoadingPersonas).some(Boolean) || isLoading;
  const hasAnyStreaming = Object.keys(streamingTexts).length > 0;
  const hasAnyInsights = insights.length > 0 || Object.values(bandInsights).some(arr => arr.length > 0);

  // Multi-lane mode (band)
  if (personas.length > 0) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="flex-none mb-4 px-6 pt-6 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-[0.2em] text-gray-500 uppercase">Perspective Shift</h2>
          {hasAnyLoading && <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping"></div>}
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar px-6 pb-6">
          <div className="grid grid-cols-1 gap-4">
            {personas.map((pid) => {
              const persona = PERSONAS.find(p => p.id === pid);
              const personaInsights = bandInsights[pid] || [];
              const streamingText = streamingTexts[pid] || '';
              const isLoading = isLoadingPersonas[pid] || false;

              return (
                <div
                  key={pid}
                  className="glass-panel rounded-xl p-4 border border-white/5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-bold uppercase tracking-widest ${
                      persona?.color === 'cyan' ? 'text-cyan-300' :
                      persona?.color === 'rose' ? 'text-rose-300' :
                      persona?.color === 'violet' ? 'text-violet-300' :
                      persona?.color === 'purple' ? 'text-purple-300' :
                      'text-gray-300'
                    }`}>
                      {persona?.name || pid}
                    </span>
                    {isLoading && <div className="h-1 w-1 rounded-full bg-purple-500 animate-ping"></div>}
                  </div>

                  {isLoading && streamingText && (
                    <div className="mb-3">
                      <p className="text-gray-300 text-sm font-light leading-relaxed">
                        {streamingText}
                        <span className="inline-block w-1 h-3 ml-1 bg-purple-400 animate-blink align-middle"></span>
                      </p>
                    </div>
                  )}

                  {personaInsights.length > 0 && (
                    <div className="space-y-2">
                      {personaInsights.map((insight) => (
                        <Card key={insight.id} insight={insight} />
                      ))}
                    </div>
                  )}

                  {!isLoading && personaInsights.length === 0 && text.length >= 10 && (
                    <div className="py-4 flex items-center justify-center text-gray-600 opacity-40">
                      <div className="w-6 h-6 border-2 border-t-transparent border-white/20 rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!hasAnyLoading && !hasAnyInsights && text.length < 10 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-30 select-none">
              <span className="text-6xl mb-4 font-thin opacity-50">↹</span>
              <p className="font-medium tracking-widest text-xs uppercase">
                Waiting for input
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Single lane mode (backward compatible)
  return (
    <div className="h-full flex flex-col p-6 bg-gradient-to-b from-white/[0.02] to-transparent">
      <div className="flex-none mb-6 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-[0.2em] text-gray-500 uppercase">Perspective Shift</h2>
        {isLoading && <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping"></div>}
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
        {isLoading && streamingTexts._single && (
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 animate-pulse">
            <p className="text-gray-300 text-base font-light leading-relaxed">
              {streamingTexts._single}
              <span className="inline-block w-1.5 h-4 ml-1 bg-purple-400 animate-blink align-middle"></span>
            </p>
          </div>
        )}
        
        {!isLoading && insights.length === 0 && text.length >= 10 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-40">
             <div className="w-8 h-8 border-2 border-t-transparent border-white/20 rounded-full animate-spin mb-4"></div>
          </div>
        )}
        
        {!isLoading && insights.length === 0 && text.length < 10 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-30 select-none">
            <span className="text-6xl mb-4 font-thin opacity-50">↹</span>
            <p className="font-medium tracking-widest text-xs uppercase">
              Waiting for input
            </p>
          </div>
        )}
        
        {insights.map((insight) => (
          <Card key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}
