import { describe, test, expect } from 'bun:test';
import { fingerprint } from '../fingerprint';

describe('fingerprint', () => {
  test('generates consistent fingerprints for same input', () => {
    const fp1 = fingerprint('test text', ['steelman', 'red-team']);
    const fp2 = fingerprint('test text', ['steelman', 'red-team']);
    expect(fp1).toBe(fp2);
  });

  test('generates different fingerprints for different text', () => {
    const fp1 = fingerprint('test text', ['steelman']);
    const fp2 = fingerprint('different text', ['steelman']);
    expect(fp1).not.toBe(fp2);
  });

  test('generates same fingerprint regardless of persona order', () => {
    const fp1 = fingerprint('test', ['steelman', 'red-team']);
    const fp2 = fingerprint('test', ['red-team', 'steelman']);
    expect(fp1).toBe(fp2);
  });

  test('generates different fingerprints for different personas', () => {
    const fp1 = fingerprint('test', ['steelman']);
    const fp2 = fingerprint('test', ['red-team']);
    expect(fp1).not.toBe(fp2);
  });
});

