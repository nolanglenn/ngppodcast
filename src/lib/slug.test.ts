import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Episode 42: The Return')).toBe('episode-42-the-return');
  });

  it('strips leading/trailing hyphens from punctuation', () => {
    expect(slugify('!!Hello World!!')).toBe('hello-world');
  });
});
