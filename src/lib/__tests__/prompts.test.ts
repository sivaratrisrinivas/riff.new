import { describe, test, expect } from 'bun:test';
import { buildPrompt, buildBandPrompt } from '../prompts';

describe('buildPrompt', () => {
  test('includes user text in prompt', () => {
    const prompt = buildPrompt('test text');
    expect(prompt).toContain('test text');
  });

  test('includes JSON format instructions', () => {
    const prompt = buildPrompt('test');
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('type');
    expect(prompt).toContain('content');
  });
});

describe('buildBandPrompt', () => {
  test('includes all personas in prompt', () => {
    const prompt = buildBandPrompt('test', ['steelman', 'red-team']);
    expect(prompt).toContain('steelman');
    expect(prompt).toContain('red-team');
  });

  test('includes user text', () => {
    const prompt = buildBandPrompt('test text', ['steelman']);
    expect(prompt).toContain('test text');
  });

  test('includes JSON object format', () => {
    const prompt = buildBandPrompt('test', ['steelman']);
    expect(prompt).toContain('{');
    expect(prompt).toContain('}');
  });
});

