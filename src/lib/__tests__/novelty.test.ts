import { describe, test, expect } from 'bun:test';
import { jaccardShingles, isNovel } from '../novelty';

describe('jaccardShingles', () => {
  test('returns 1 for identical strings', () => {
    const similarity = jaccardShingles('hello world', 'hello world');
    expect(similarity).toBe(1);
  });

  test('returns 0 for completely different strings', () => {
    const similarity = jaccardShingles('hello', 'xyzabc');
    expect(similarity).toBeLessThan(0.5);
  });

  test('returns high similarity for similar strings', () => {
    const similarity = jaccardShingles('hello world', 'hello world!');
    expect(similarity).toBeGreaterThan(0.8);
  });
});

describe('isNovel', () => {
  test('returns true for first text', () => {
    expect(isNovel('hello world', null)).toBe(true);
  });

  test('returns true for significantly different text', () => {
    expect(isNovel('hello world', 'completely different text')).toBe(true);
  });

  test('returns false for very similar text', () => {
    const text1 = 'This is a test sentence with many words to check similarity';
    const text2 = 'This is a test sentence with many words to check similarity!';
    expect(isNovel(text1, text2)).toBe(false);
  });
});

