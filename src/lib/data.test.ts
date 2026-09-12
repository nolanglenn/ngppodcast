import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./spotify', () => ({ fetchAllSpotifyEpisodes: vi.fn() }));
vi.mock('./youtube', () => ({ fetchChannelUploads: vi.fn(), matchEpisodeToUpload: vi.fn() }));
vi.mock('./sheets', () => ({ fetchRetroListRows: vi.fn(), mapSheetRowsToRetroList: vi.fn() }));
vi.mock('./cache', () => ({
  getFreshEpisodes: vi.fn(),
  getLastGoodEpisodes: vi.fn(),
  setEpisodesSnapshot: vi.fn(),
  getCachedYoutubeMatch: vi.fn(),
  setCachedYoutubeMatch: vi.fn(),
  getCachedRetroList: vi.fn(),
  setCachedRetroList: vi.fn(),
}));

import { fetchAllSpotifyEpisodes } from './spotify';
import { fetchChannelUploads, matchEpisodeToUpload } from './youtube';
import {
  getFreshEpisodes,
  getLastGoodEpisodes,
  setEpisodesSnapshot,
  getCachedYoutubeMatch,
  setCachedYoutubeMatch,
} from './cache';
import { getEpisodes } from './data';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SPOTIFY_SHOW_ID = 'show1';
  process.env.YOUTUBE_CHANNEL_ID = 'channel1';
  delete process.env.MOCK_DATA;
});

describe('getEpisodes', () => {
  it('returns the fresh cached snapshot without calling external APIs', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue([
      {
        id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01',
        durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none',
      },
    ]);

    const result = await getEpisodes();

    expect(result).toHaveLength(1);
    expect(fetchAllSpotifyEpisodes).not.toHaveBeenCalled();
  });

  it('builds fresh data, matching new episodes against youtube uploads once', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(fetchAllSpotifyEpisodes).mockResolvedValue([
      { id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01', durationMs: 1, spotifyUrl: 'x' },
    ]);
    vi.mocked(fetchChannelUploads).mockResolvedValue([]);
    vi.mocked(getCachedYoutubeMatch).mockResolvedValue(null);
    vi.mocked(matchEpisodeToUpload).mockReturnValue({ videoId: null, status: 'none', score: 0 });

    const result = await getEpisodes();

    expect(result[0].youtubeMatchStatus).toBe('none');
    expect(setCachedYoutubeMatch).toHaveBeenCalledWith('ep1', { videoId: null, status: 'none', score: 0 });
    expect(setEpisodesSnapshot).toHaveBeenCalled();
  });

  it('falls back to the last-good snapshot when a live fetch fails', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(fetchAllSpotifyEpisodes).mockRejectedValue(new Error('Spotify down'));
    vi.mocked(getLastGoodEpisodes).mockResolvedValue([
      {
        id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01',
        durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none',
      },
    ]);

    const result = await getEpisodes();

    expect(result).toHaveLength(1);
  });

  it('re-throws when there is no fresh data and no last-good snapshot', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(fetchAllSpotifyEpisodes).mockRejectedValue(new Error('Spotify down'));
    vi.mocked(getLastGoodEpisodes).mockResolvedValue(null);

    await expect(getEpisodes()).rejects.toThrow('Spotify down');
  });

  it('returns mock episodes when MOCK_DATA=true, bypassing all external calls', async () => {
    process.env.MOCK_DATA = 'true';
    const result = await getEpisodes();
    expect(result[0].id).toBe('mock-ep-1');
    expect(fetchAllSpotifyEpisodes).not.toHaveBeenCalled();
  });
});
