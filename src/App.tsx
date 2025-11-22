import { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from './components/Editor';
import { Insights } from './components/Insights';
import { PersonaBar } from './components/PersonaBar';
import type { Insight } from './types';
import { PERSONAS } from './lib/personas';

export function App() {
  const [text, setText] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [accentColor, setAccentColor] = useState<'cyan' | 'rose' | 'violet'>('cyan');
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['steelman', 'red-team', 'socratic']);
  const [autoMode, setAutoMode] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setWs(websocket);
      wsRef.current = websocket;
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      setWs(null);
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          window.location.reload();
        }
      }, 3000);
    };

    return () => {
      websocket.close();
    };
  }, []);

  const getBlobColors = () => {
    switch (accentColor) {
      case 'rose':
        return {
          blob1: 'bg-rose-900/20',
          blob2: 'bg-orange-900/20',
          blob3: 'bg-red-900/20',
          accent: 'bg-rose-500',
          shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.8)]'
        };
      case 'violet':
        return {
          blob1: 'bg-violet-900/20',
          blob2: 'bg-fuchsia-900/20',
          blob3: 'bg-purple-900/20',
          accent: 'bg-violet-500',
          shadow: 'shadow-[0_0_10px_rgba(139,92,246,0.8)]'
        };
      case 'cyan':
      default:
        return {
          blob1: 'bg-cyan-900/20',
          blob2: 'bg-blue-900/20',
          blob3: 'bg-teal-900/20',
          accent: 'bg-cyan-500',
          shadow: 'shadow-[0_0_10px_rgba(6,182,212,0.8)]'
        };
    }
  };

  const colors = getBlobColors();

  const handleInsightsChange = useCallback((insights: Insight[]) => {
    if (insights.length === 0) return;
    
    // Determine dominant type or just use the first one for now
    const firstType = insights[0].type;
    if (firstType === 'counter-argument') setAccentColor('rose');
    else if (firstType === 'lateral-prompt') setAccentColor('violet');
    else setAccentColor('cyan');
  }, []);

  const handleTogglePersona = (personaId: string) => {
    setSelectedPersonas((prev) => {
      if (prev.includes(personaId)) {
        return prev.filter(id => id !== personaId);
      } else {
        return [...prev, personaId];
      }
    });
  };

  const handleAnalyze = () => {
    if (!ws || !text || text.length < 10 || selectedPersonas.length === 0) return;
    setIsAnalyzing(true);
    ws.send(JSON.stringify({ 
      type: 'analyze', 
      text,
      personas: selectedPersonas,
      fp: '', // Will be computed server-side
    }));
  };

  return (
    <div className="relative h-screen w-screen bg-gray-900 overflow-hidden selection:bg-cyan-500/30 flex flex-col transition-colors duration-1000">
      {/* Animated Background Blobs */}
      <div className={`absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] ${colors.blob1} rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob transition-colors duration-1000`}></div>
      <div className={`absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] ${colors.blob2} rounded-full mix-blend-screen filter blur-[80px] opacity-40 animate-blob animation-delay-2000 transition-colors duration-1000`}></div>
      <div className={`absolute bottom-[-20%] left-[20%] w-[45vw] h-[45vw] ${colors.blob3} rounded-full mix-blend-screen filter blur-[90px] opacity-40 animate-blob animation-delay-4000 transition-colors duration-1000`}></div>

      {/* Noise/Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      <header className="flex-none px-8 py-6 flex items-center justify-center z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50 skew-title cursor-default select-none">
            SKEW
          </h1>
          <div className={`h-1.5 w-1.5 rounded-full ${colors.accent} animate-pulse ${colors.shadow} transition-colors duration-1000`}></div>
        </div>
      </header>
      
      <main className="flex-1 min-h-0 flex flex-col z-10">
        <div className="flex-none px-4 md:px-8 pt-0 pb-4">
          <div className="glass-panel rounded-2xl overflow-hidden border-white/5">
            <PersonaBar
              selectedPersonas={selectedPersonas}
              onTogglePersona={handleTogglePersona}
              autoMode={autoMode}
              onToggleAutoMode={() => setAutoMode(!autoMode)}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              textLength={text.length}
            />
          </div>
        </div>
        
        <div className="flex-1 min-h-0 p-4 md:p-8 pt-0 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          <div className="glass-panel rounded-2xl flex flex-col overflow-hidden relative group border-white/5 hover:border-white/10 transition-colors">
            <Editor onTextChange={setText} />
          </div>
          <div className="glass-panel rounded-2xl flex flex-col overflow-hidden relative group border-white/5 hover:border-white/10 transition-colors">
            <Insights 
              text={text} 
              ws={ws} 
              personas={selectedPersonas}
              autoMode={autoMode}
              onInsightsChange={handleInsightsChange}
              onAnalyzingChange={setIsAnalyzing}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

