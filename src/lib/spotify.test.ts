import { describe, it, expect, vi } from 'vitest';
import { fetchAllSpotifyEpisodes } from './spotify';

function mockFetchSequence(responses: Array<{ ok: boolean; status?: number; json: () => unknown }>) {
  let call = 0;
  return vi.fn(async () => {
    const response = responses[call];
    call += 1;
    return response as unknown as Response;
  });
}

describe('fetchAllSpotifyEpisodes', () => {
  it('fetches a token then paginates through all episode pages', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'id';
    process.env.SPOTIFY_CLIENT_SECRET = 'secret';

    const fetchImpl = mockFetchSequence([
      { ok: true, json: () => ({ access_token: 'token123', expires_in: 3600, token_type: 'Bearer' }) },
      {
        ok: true,
        json: () => ({
          items: [
            {
              id: 'ep1',
              name: 'Episode One',
              description: 'First episode',
              release_date: '2026-01-01',
              duration_ms: 1000,
              external_urls: { spotify: 'https://open.spotify.com/episode/ep1' },
            },
          ],
          next: 'https://api.spotify.com/v1/shows/show1/episodes?offset=50',
        }),
      },
      {
        ok: true,
        json: () => ({
          items: [
            {
              id: 'ep2',
              name: 'Episode Two',
              description: 'Second episode',
              release_date: '2026-01-08',
              duration_ms: 2000,
              external_urls: { spotify: 'https://open.spotify.com/episode/ep2' },
            },
          ],
          next: null,
        }),
      },
    ]);

    const episodes = await fetchAllSpotifyEpisodes('show1', fetchImpl);

    expect(episodes).toHaveLength(2);
    expect(episodes[0]).toEqual({
      id: 'ep1',
      slug: 'episode-one',
      title: 'Episode One',
      description: 'First episode',
      releaseDate: '2026-01-01',
      durationMs: 1000,
      spotifyUrl: 'https://open.spotify.com/episode/ep1',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3); // token + 2 pages
  });

  it('gives episodes with identical titles distinct slugs, and empty-slug titles their id', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'id';
    process.env.SPOTIFY_CLIENT_SECRET = 'secret';

    const item = (id: string, name: string) => ({
      id,
      name,
      description: '',
      release_date: '2026-01-01',
      duration_ms: 1,
      external_urls: { spotify: `https://open.spotify.com/episode/${id}` },
    });

    const fetchImpl = mockFetchSequence([
      { ok: true, json: () => ({ access_token: 'token123', expires_in: 3600, token_type: 'Bearer' }) },
      {
        ok: true,
        json: () => ({
          items: [
            item('aaaa1111', 'Mailbag Episode'),
            item('bbbb2222', 'Mailbag Episode'),
            item('cccc3333', '★☆★'),
          ],
          next: null,
        }),
      },
    ]);

    const episodes = await fetchAllSpotifyEpisodes('show1', fetchImpl);

    expect(episodes.map((e) => e.slug)).toEqual([
      'mailbag-episode',
      'mailbag-episode-bbbb2222',
      'cccc3333',
    ]);
    expect(new Set(episodes.map((e) => e.slug)).size).toBe(3);
    expect(episodes.every((e) => e.slug.length > 0)).toBe(true);
  });

  it('maps html_description to descriptionHtml, and omits it when absent', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'id';
    process.env.SPOTIFY_CLIENT_SECRET = 'secret';

    const fetchImpl = mockFetchSequence([
      { ok: true, json: () => ({ access_token: 'token123', expires_in: 3600, token_type: 'Bearer' }) },
      {
        ok: true,
        json: () => ({
          items: [
            {
              id: 'ep1',
              name: 'Has HTML',
              description: 'plain textno separators',
              html_description: '<p>plain text</p><p>no separators</p>',
              release_date: '2026-01-01',
              duration_ms: 1000,
              external_urls: { spotify: 'https://open.spotify.com/episode/ep1' },
            },
            {
              id: 'ep2',
              name: 'No HTML field',
              description: 'older episode, no html_description at all',
              release_date: '2026-01-08',
              duration_ms: 1000,
              external_urls: { spotify: 'https://open.spotify.com/episode/ep2' },
            },
          ],
          next: null,
        }),
      },
    ]);

    const episodes = await fetchAllSpotifyEpisodes('show1', fetchImpl);

    expect(episodes[0].descriptionHtml).toBe('<p>plain text</p><p>no separators</p>');
    expect(episodes[1].descriptionHtml).toBeUndefined();
  });

  it('skips null items (episodes unavailable in the API market)', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'id';
    process.env.SPOTIFY_CLIENT_SECRET = 'secret';

    const fetchImpl = mockFetchSequence([
      { ok: true, json: () => ({ access_token: 'token123', expires_in: 3600, token_type: 'Bearer' }) },
      {
        ok: true,
        json: () => ({
          items: [
            null,
            {
              id: 'ep1',
              name: 'Episode One',
              description: '',
              release_date: '2026-01-01',
              duration_ms: 1000,
              external_urls: { spotify: 'https://open.spotify.com/episode/ep1' },
            },
          ],
          next: null,
        }),
      },
    ]);

    const episodes = await fetchAllSpotifyEpisodes('show1', fetchImpl);

    expect(episodes).toHaveLength(1);
    expect(episodes[0].id).toBe('ep1');
  });
});
