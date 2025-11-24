import { useState, useEffect, useRef } from 'react';
import type { Bias } from '../types';
import { BiasTooltip } from './BiasTooltip';

interface EditorProps {
  onTextChange: (text: string) => void;
  biases?: Bias[];
  analyzedText?: string; // The text that was analyzed (for bias positioning)
}

export function Editor({ onTextChange, biases = [], analyzedText }: EditorProps) {
  const [text, setText] = useState('');
  const timeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [hoveredBias, setHoveredBias] = useState<Bias | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

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

  // Calculate highlight positions
  const getHighlightPositions = () => {
    if (!textareaRef.current || !measureRef.current || biases.length === 0) {
      return [];
    }

    // Only show biases if we have analyzed text and biases are valid
    if (!analyzedText || analyzedText.length === 0) {
      return [];
    }

    // Only show biases if the current text matches the analyzed text (or is close)
    // This prevents showing biases on text that has changed significantly
    if (Math.abs(text.length - analyzedText.length) > 10) {
      return [];
    }

    const textarea = textareaRef.current;
    const measure = measureRef.current;
    const positions: Array<{ bias: Bias; top: number; left: number; width: number; height: number }> = [];

    // Set measurement div to match textarea content (use current text for rendering)
    measure.textContent = text;
    const style = window.getComputedStyle(textarea);
    measure.style.fontSize = style.fontSize;
    measure.style.fontFamily = style.fontFamily;
    measure.style.fontWeight = style.fontWeight;
    measure.style.lineHeight = style.lineHeight;
    measure.style.padding = style.padding;
    measure.style.width = style.width;
    measure.style.wordWrap = 'break-word';
    measure.style.whiteSpace = 'pre-wrap';

    // Create a range to measure text positions
    const range = document.createRange();
    const textNode = measure.firstChild || measure.appendChild(document.createTextNode(text));

    for (const bias of biases) {
      // Validate bias positions against analyzed text
      if (bias.start < 0 || bias.end > analyzedText.length || bias.start >= bias.end) {
        continue;
      }
      
      // Check if the bias content still matches at that position in current text
      const biasContentInAnalyzed = analyzedText.substring(bias.start, bias.end);
      if (text.length >= bias.end) {
        const biasContentInCurrent = text.substring(bias.start, bias.end);
        // If content has changed significantly, skip this bias
        if (biasContentInCurrent !== biasContentInAnalyzed && 
            Math.abs(biasContentInCurrent.length - biasContentInAnalyzed.length) > 2) {
          continue;
        }
      } else {
        // Text is shorter than bias end, skip
        continue;
      }

      try {
        // Measure position of start character
        range.setStart(textNode, Math.min(bias.start, text.length));
        range.setEnd(textNode, Math.min(bias.start + 1, text.length));
        const startRect = range.getBoundingClientRect();
        const measureRect = measure.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();

        // Measure position of end character
        range.setStart(textNode, Math.min(bias.end, text.length));
        range.setEnd(textNode, Math.min(bias.end, text.length));
        const endRect = range.getBoundingClientRect();

        const top = startRect.top - measureRect.top + textarea.scrollTop;
        const left = startRect.left - measureRect.left;
        const width = endRect.left - startRect.left;
        const height = startRect.height;

        positions.push({ bias, top, left, width, height });
      } catch (e) {
        console.warn('Failed to calculate position for bias:', bias, e);
      }
    }

    return positions;
  };

  const highlightPositions = getHighlightPositions();

  const handleBiasHover = (bias: Bias, event: React.MouseEvent<HTMLSpanElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const textareaRect = textareaRef.current?.getBoundingClientRect();
    if (textareaRect) {
      setTooltipPosition({
        top: rect.top - textareaRect.top + textareaRef.current.scrollTop,
        left: rect.left - textareaRect.left + rect.width / 2,
      });
      setHoveredBias(bias);
    }
  };

  const handleBiasLeave = () => {
    setHoveredBias(null);
    setTooltipPosition(null);
  };

  return (
    <div className="h-full flex flex-col p-6 bg-gradient-to-b from-white/[0.02] to-transparent">
      <div className="flex-none mb-6 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-[0.2em] text-gray-500 uppercase">Origin Point</h2>
        <div className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${text.length > 0 ? 'bg-cyan-500' : 'bg-gray-700'}`}></div>
      </div>
      
      <div className="flex-1 relative">
        {/* Hidden measurement div */}
        <div
          ref={measureRef}
          className="absolute invisible whitespace-pre-wrap break-words"
          style={{
            fontSize: 'inherit',
            fontFamily: 'inherit',
            fontWeight: 'inherit',
            lineHeight: 'inherit',
            padding: 'inherit',
            width: '100%',
          }}
        />
        
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something true..."
          className="
            relative z-10 flex-1 w-full h-full resize-none
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
        
        {/* Highlight overlay */}
        {biases.length > 0 && (
          <div
            ref={overlayRef}
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            {highlightPositions.map(({ bias, top, left, width, height }) => (
              <span
                key={bias.id}
                className="absolute pointer-events-auto cursor-help"
                style={{
                  top: `${top + height - 2}px`,
                  left: `${left}px`,
                  width: `${width}px`,
                  height: '2px',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='2'%3E%3Cpath d='M0,1 Q1,0 2,1 T4,1' stroke='rgba(251,191,36,0.6)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'repeat-x',
                  backgroundSize: '4px 2px',
                }}
                onMouseEnter={(e) => handleBiasHover(bias, e)}
                onMouseLeave={handleBiasLeave}
              />
            ))}
            
            {/* Tooltip */}
            {hoveredBias && tooltipPosition && (
              <BiasTooltip bias={hoveredBias} position={tooltipPosition} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
