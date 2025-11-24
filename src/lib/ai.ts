import { GoogleGenAI } from '@google/genai';
import { buildPrompt, buildBandPrompt, buildBiasPrompt } from './prompts';
import type { Insight, Bias } from '../types';

const apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey) {
  console.warn('GEMINI_API_KEY not set. AI features will not work.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function* generateInsights(text: string): AsyncGenerator<string, void, unknown> {
  if (!text.trim() || text.length < 10 || !ai) {
    return;
  }

  try {
    const prompt = buildPrompt(text);
    
    // Use the documented API: contents is a string, not an array
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    // Simulate streaming by yielding text in chunks
    const fullText = response.text || '';
    const words = fullText.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? '' : ' ') + words[i];
      yield chunk;
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  } catch (error) {
    console.error('AI generation error:', error);
    throw error;
  }
}

export async function parseInsights(streamedText: string): Promise<Insight[]> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = streamedText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any, index: number) => ({
        id: `insight-${Date.now()}-${index}`,
        type: item.type || 'lateral-prompt',
        content: item.content || '',
        timestamp: Date.now(),
      }));
    }
    
    // Fallback: treat as single insight
    return [{
      id: `insight-${Date.now()}`,
      type: 'lateral-prompt' as const,
      content: streamedText.trim(),
      timestamp: Date.now(),
    }];
  } catch (error) {
    // Fallback: return as single insight
    return [{
      id: `insight-${Date.now()}`,
      type: 'lateral-prompt' as const,
      content: streamedText.trim() || 'Unable to generate insight',
      timestamp: Date.now(),
    }];
  }
}

export async function* generateBandInsights(
  text: string,
  personas: string[]
): AsyncGenerator<{ personaId: string; chunk: string } | { done: true; result: Record<string, any[]> }, void, unknown> {
  if (!text.trim() || text.length < 10 || !ai || personas.length === 0) {
    return;
  }

  try {
    const prompt = buildBandPrompt(text, personas);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const fullText = response.text || '';
    
    // Try to parse as JSON object keyed by persona
    let parsed: Record<string, any[]> = {};
    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // If parsing fails, distribute text evenly across personas
      const wordsPerPersona = Math.ceil(fullText.split(' ').length / personas.length);
      const words = fullText.split(' ');
      personas.forEach((pid, idx) => {
        const start = idx * wordsPerPersona;
        const end = Math.min(start + wordsPerPersona, words.length);
        parsed[pid] = [{ type: 'lateral-prompt', content: words.slice(start, end).join(' ') }];
      });
    }

    // Simulate streaming per persona
    const personaTexts: Record<string, string[]> = {};
    for (const pid of personas) {
      const insights = parsed[pid] || [];
      personaTexts[pid] = insights.map((ins: any) => {
        const prefix = ins.type === 'counter-argument' ? 'Counterpoint: ' : 
                      ins.type === 'question' ? 'Question: ' : 'Lateral: ';
        return prefix + (ins.content || '');
      });
    }

    // Stream words per persona, interleaving
    const maxLength = Math.max(...Object.values(personaTexts).map(arr => arr.join(' ').split(' ').length));
    
    for (let wordIdx = 0; wordIdx < maxLength; wordIdx++) {
      for (const pid of personas) {
        const text = personaTexts[pid].join(' ');
        const words = text.split(' ');
        if (wordIdx < words.length) {
          const chunk = (wordIdx === 0 ? '' : ' ') + words[wordIdx];
          yield { personaId: pid, chunk };
          await new Promise(resolve => setTimeout(resolve, 15));
        }
      }
    }
    
    // Yield the parsed result at the end
    yield { done: true, result: parsed };
  } catch (error) {
    console.error('AI band generation error:', error);
    throw error;
  }
}

export function parseBandInsights(
  parsed: Record<string, any[]>,
  personas: string[]
): Record<string, Insight[]> {
  const result: Record<string, Insight[]> = {};
  
  try {
    for (const pid of personas) {
      const insights = parsed[pid] || [];
      result[pid] = insights.map((item: any, index: number) => ({
        id: `insight-${Date.now()}-${pid}-${index}`,
        type: item.type || 'lateral-prompt',
        content: item.content || '',
        timestamp: Date.now(),
        personaId: pid,
      }));
    }
  } catch (error) {
    // Fallback: one insight per persona
    personas.forEach(pid => {
      result[pid] = [{
        id: `insight-${Date.now()}-${pid}`,
        type: 'lateral-prompt' as const,
        content: 'Unable to generate insight',
        timestamp: Date.now(),
        personaId: pid,
      }];
    });
  }
  
  return result;
}

export async function generateBiasDetection(text: string): Promise<Bias[]> {
  if (!text.trim() || text.length < 10 || !ai) {
    return [];
  }

  try {
    const prompt = buildBiasPrompt(text);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const fullText = response.text || '';
    
    // Try to extract JSON array from the response
    try {
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((item: any, index: number) => ({
          id: `bias-${Date.now()}-${index}`,
          type: item.type || 'unknown-bias',
          content: item.content || '',
          explanation: item.explanation || 'Potential bias detected.',
          start: typeof item.start === 'number' ? item.start : 0,
          end: typeof item.end === 'number' ? item.end : 0,
        })).filter((bias: Bias) => bias.start >= 0 && bias.end > bias.start);
      }
    } catch (e) {
      console.warn('Failed to parse bias detection JSON:', e);
    }
    
    return [];
  } catch (error) {
    console.error('Bias detection error:', error);
    return [];
  }
}

