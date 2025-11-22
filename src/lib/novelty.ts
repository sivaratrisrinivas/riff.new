export function jaccardShingles(a: string, b: string, n: number = 5): number {
  const createShingles = (text: string): Set<string> => {
    const shingles = new Set<string>();
    for (let i = 0; i <= text.length - n; i++) {
      shingles.add(text.slice(i, i + n));
    }
    return shingles;
  };

  const A = createShingles(a);
  const B = createShingles(b);
  
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;

  const intersection = new Set([...A].filter(x => B.has(x)));
  const union = new Set([...A, ...B]);
  
  return intersection.size / union.size;
}

const NOVELTY_THRESHOLD = 0.85; // If similarity > 85%, consider it too similar

export function isNovel(current: string, previous: string | null): boolean {
  if (!previous) return true;
  const similarity = jaccardShingles(current, previous);
  return similarity < NOVELTY_THRESHOLD;
}

