import { useState, useEffect, useRef } from 'react';

interface EditorProps {
  onTextChange: (text: string) => void;
}

export function Editor({ onTextChange }: EditorProps) {
  const [text, setText] = useState('');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (text.trim().length >= 10) {
        onTextChange(text);
      }
    }, 2000) as unknown as number;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, onTextChange]);

  return (
    <div className="h-full flex flex-col p-6 bg-gradient-to-b from-white/[0.02] to-transparent">
      <div className="flex-none mb-6 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-[0.2em] text-gray-500 uppercase">Origin Point</h2>
        <div className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${text.length > 0 ? 'bg-cyan-500' : 'bg-gray-700'}`}></div>
      </div>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something true..."
        className="
          flex-1 w-full resize-none
          bg-transparent border-0
          text-gray-100 placeholder-gray-700
          text-xl md:text-2xl leading-relaxed font-light
          focus:outline-none focus:ring-0
          selection:bg-cyan-500/20
          custom-scrollbar
        "
        spellCheck={false}
        autoFocus
      />
    </div>
  );
}
