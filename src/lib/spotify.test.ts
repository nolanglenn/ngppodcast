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
});
