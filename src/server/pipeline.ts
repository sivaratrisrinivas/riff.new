import { generateInsights, parseInsights, generateBandInsights, parseBandInsights } from '../lib/ai';
import type { Insight } from '../types';

export type StepSpec = {
  id: string;
  kind: 'persona' | 'summarize' | 'map';
  config: Record<string, any>;
};

export type ChainSpec = {
  id: string;
  name: string;
  steps: StepSpec[];
};

export type Chunk<T = any> = {
  stepId: string;
  token?: string;
  done?: T;
};

export async function* runChain(
  chain: ChainSpec,
  input: string
): AsyncGenerator<Chunk, void, unknown> {
  let current = input;

  for (const step of chain.steps) {
    if (step.kind === 'persona') {
      const personas = step.config.personas || [];
      
      if (personas.length > 0) {
        // Band mode: multiple personas
        let parsedResult: Record<string, any[]> | null = null;
        
        for await (const item of generateBandInsights(current, personas)) {
          if ('done' in item && item.done) {
            parsedResult = item.result;
            break;
          } else if ('personaId' in item) {
            yield {
              stepId: step.id,
              token: item.chunk,
            };
          }
        }
        
        if (parsedResult) {
          const allInsights = parseBandInsights(parsedResult, personas);
          yield {
            stepId: step.id,
            done: allInsights,
          };
          // Convert insights to text for next step
          current = JSON.stringify(
            Object.entries(allInsights).map(([pid, insights]) => ({
              persona: pid,
              insights: insights.map(i => ({ type: i.type, content: i.content })),
            }))
          );
        }
      } else {
        // Single persona mode
        let fullText = '';
        for await (const chunk of generateInsights(current)) {
          fullText += chunk;
          yield {
            stepId: step.id,
            token: chunk,
          };
        }
        
        const insights = await parseInsights(fullText);
        yield {
          stepId: step.id,
          done: insights,
        };
        current = JSON.stringify(insights.map(i => ({ type: i.type, content: i.content })));
      }
    } else if (step.kind === 'summarize') {
      let acc = '';
      for await (const t of generateInsights(current)) {
        acc += t;
        yield {
          stepId: step.id,
          token: t,
        };
      }
      current = acc;
      yield {
        stepId: step.id,
        done: acc,
      };
    } else if (step.kind === 'map') {
      // Map step: transform the input (placeholder for future extensibility)
      const transformed = step.config.transform ? step.config.transform(current) : current;
      yield {
        stepId: step.id,
        done: transformed,
      };
      current = transformed;
    }
  }
}

