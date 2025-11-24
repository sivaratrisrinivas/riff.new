import { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from './components/Editor';
import { Insights } from './components/Insights';
import { PersonaBar } from './components/PersonaBar';
import type { Insight, Bias } from './types';
import { PERSONAS } from './lib/personas';

export function App() {
  const [text, setText] = useState('');
  const [analyzedText, setAnalyzedText] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [accentColor, setAccentColor] = useState<'cyan' | 'rose' | 'violet'>('cyan');
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['steelman', 'red-team', 'socratic']);
  const [autoMode, setAutoMode] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [biasMode, setBiasMode] = useState(false);
  const [biases, setBiases] = useState<Bias[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    shouldReconnectRef.current = true;

    const connect = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
      const attempt = reconnectAttemptsRef.current + 1;

      console.info(`[ws] connecting (attempt ${attempt})`);
    const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        if (!shouldReconnectRef.current) {
          websocket.close();
          return;
        }

        reconnectAttemptsRef.current = 0;
        wsRef.current = websocket;
        setWs(websocket);
        console.info('[ws] connected');
    };

    websocket.onerror = (error) => {
        console.error('[ws] error', error);
    };

      websocket.onclose = (event) => {
        if (wsRef.current === websocket) {
          wsRef.current = null;
      setWs(null);
        }

        if (!shouldReconnectRef.current) {
          return;
        }

        const nextAttempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = nextAttempt;
        const delay = Math.min(1000 * 2 ** (nextAttempt - 1), 10000);

        console.warn(
          `[ws] closed (code ${event.code}${
            event.reason ? `, reason: ${event.reason}` : ''
          }). retrying in ${delay}ms`
        );

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = window.setTimeout(connect, delay);
    };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWs(null);
    };
  }, []);

  // Handle WebSocket messages for bias detection
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'biases' && data.biases) {
          setBiases(data.biases as Bias[]);
          // Store the text that was analyzed for bias positioning
          setAnalyzedText(text);
        } else if (data.type === 'analyze' || data.type === 'stream') {
          // When analysis starts, update analyzed text
          setAnalyzedText(text);
        } else if (data.type === 'complete' || data.type === 'cache-hit') {
          // Keep analyzed text for bias positioning
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, biasMode]);

  // Clear biases when text changes significantly or biasMode is turned off
  useEffect(() => {
    if (!biasMode) {
      setBiases([]);
    }
  }, [biasMode, text]);

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
    if (
      !ws ||
      ws.readyState !== WebSocket.OPEN ||
      !text ||
      text.length < 10 ||
      selectedPersonas.length === 0
    ) {
      return;
    }
    setIsAnalyzing(true);
    ws.send(JSON.stringify({ 
      type: 'analyze', 
      text,
      personas: selectedPersonas,
      fp: '', // Will be computed server-side
      detectBias: biasMode,
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
              biasMode={biasMode}
              onToggleBiasMode={() => setBiasMode(!biasMode)}
            />
          </div>
        </div>
        
        <div className="flex-1 min-h-0 p-4 md:p-8 pt-0 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          <div className="glass-panel rounded-2xl flex flex-col overflow-hidden relative group border-white/5 hover:border-white/10 transition-colors">
            <Editor onTextChange={setText} biases={biases} analyzedText={analyzedText} />
          </div>
          <div className="glass-panel rounded-2xl flex flex-col overflow-hidden relative group border-white/5 hover:border-white/10 transition-colors">
            <Insights 
              text={text} 
              ws={ws} 
              personas={selectedPersonas}
              autoMode={autoMode}
              biasMode={biasMode}
              onInsightsChange={handleInsightsChange}
              onAnalyzingChange={setIsAnalyzing}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

