import { describe, test, expect, beforeEach } from 'bun:test';
import { runChain } from './pipeline';
import type { ChainSpec } from './pipeline';

// Mock the AI functions to avoid actual API calls in tests
const mockGenerateInsights = async function* (text: string) {
  yield 'test';
  yield ' insight';
};

const mockGenerateBandInsights = async function* (text: string, personas: string[]) {
  yield { personaId: personas[0], chunk: 'test' };
  yield { personaId: personas[0], chunk: ' insight' };
  yield { done: true, result: { [personas[0]]: [{ type: 'lateral-prompt', content: 'test insight' }] } };
};

describe('Pipeline Engine', () => {
  test('runs single persona step', async () => {
    const chain: ChainSpec = {
      id: 'test-chain',
      name: 'Test',
      steps: [
        {
          id: 'step1',
          kind: 'persona',
          config: { personas: [] },
        },
      ],
    };

    // Mock the AI module
    const originalGenerate = require('../lib/ai').generateInsights;
    require('../lib/ai').generateInsights = mockGenerateInsights;

    const chunks: any[] = [];
    for await (const chunk of runChain(chain, 'test input')) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some(c => c.stepId === 'step1')).toBe(true);

    // Restore
    require('../lib/ai').generateInsights = originalGenerate;
  });

  test('runs summarize step', async () => {
    const chain: ChainSpec = {
      id: 'test-chain',
      name: 'Test',
      steps: [
        {
          id: 'step1',
          kind: 'summarize',
          config: {},
        },
      ],
    };

    const chunks: any[] = [];
    for await (const chunk of runChain(chain, 'test input')) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some(c => c.stepId === 'step1')).toBe(true);
  });

  test('runs multiple steps in sequence', async () => {
    const chain: ChainSpec = {
      id: 'test-chain',
      name: 'Test',
      steps: [
        {
          id: 'step1',
          kind: 'summarize',
          config: {},
        },
        {
          id: 'step2',
          kind: 'summarize',
          config: {},
        },
      ],
    };

    const chunks: any[] = [];
    for await (const chunk of runChain(chain, 'test input')) {
      chunks.push(chunk);
    }

    const stepIds = chunks.map(c => c.stepId);
    expect(stepIds).toContain('step1');
    expect(stepIds).toContain('step2');
  });
});

