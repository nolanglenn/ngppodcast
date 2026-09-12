import { describe, it, expect } from 'vitest';
import { slugify, episodeSlug, ensureUniqueSlugs } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Episode 42: The Return')).toBe('episode-42-the-return');
  });

  it('strips leading/trailing hyphens from punctuation', () => {
    expect(slugify('!!Hello World!!')).toBe('hello-world');
  });
});

describe('episodeSlug', () => {
  it('uses the slugified title when it produces something', () => {
    expect(episodeSlug('Episode 42', '4aBcDeF')).toBe('episode-42');
  });

  it('falls back to the episode id when the title slugifies to empty', () => {
    expect(episodeSlug('!!! ???', '4aBcDeF')).toBe('4abcdef');
  });

  it('falls back to the id for a title with no ASCII alphanumerics at all', () => {
    expect(episodeSlug('★☆★', 'spotifyid1')).toBe('spotifyid1');
  });
});

describe('ensureUniqueSlugs', () => {
  it('leaves already-distinct slugs untouched', () => {
    const items = [
      { id: 'a', slug: 'one' },
      { id: 'b', slug: 'two' },
    ];
    expect(ensureUniqueSlugs(items).map((i) => i.slug)).toEqual(['one', 'two']);
  });

  it('disambiguates episodes whose identical titles collide', () => {
    const items = [
      { id: 'aaaa1111', slug: 'mailbag-episode' },
      { id: 'bbbb2222', slug: 'mailbag-episode' },
      { id: 'cccc3333', slug: 'mailbag-episode' },
    ];

    const slugs = ensureUniqueSlugs(items).map((i) => i.slug);

    expect(slugs[0]).toBe('mailbag-episode');
    expect(new Set(slugs).size).toBe(3);
    expect(slugs[1]).toBe('mailbag-episode-bbbb2222');
    expect(slugs[2]).toBe('mailbag-episode-cccc3333');
  });

  it('preserves all other fields', () => {
    const items = [
      { id: 'a', slug: 'dup', title: 'A' },
      { id: 'b', slug: 'dup', title: 'B' },
    ];
    expect(ensureUniqueSlugs(items)[1].title).toBe('B');
  });
});
