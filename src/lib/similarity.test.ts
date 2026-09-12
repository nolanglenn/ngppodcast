import { describe, it, expect } from 'vitest';
import { titleSimilarity } from './similarity';

describe('titleSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(titleSimilarity('Episode 42', 'Episode 42')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(titleSimilarity('abc', 'xyz')).toBe(0);
  });

  it('returns a high score for a near-duplicate with punctuation differences', () => {
    const score = titleSimilarity(
      'Episode 42: The Return of Chrono Trigger',
      'Episode 42 - The Return of Chrono Trigger'
    );
    expect(score).toBeGreaterThan(0.8);
  });
});
