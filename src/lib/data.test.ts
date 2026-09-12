import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
import { fetchRetroListRows, mapSheetRowsToRetroList } from './sheets';
import {
  getFreshEpisodes,
  getLastGoodEpisodes,
  setEpisodesSnapshot,
  getCachedYoutubeMatch,
  setCachedYoutubeMatch,
  getCachedRetroList,
  setCachedRetroList,
} from './cache';
import { getEpisodes, getRetroList, refreshRetroList } from './data';
import type { Episode } from './types';

function episode(overrides: Partial<Episode> & { id: string }): Episode {
  return {
    slug: `slug-${overrides.id}`,
    title: `Title ${overrides.id}`,
    description: '',
    releaseDate: '2026-01-01',
    durationMs: 1,
    spotifyUrl: 'x',
    youtubeVideoId: null,
    youtubeMatchStatus: 'none',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  process.env.SPOTIFY_SHOW_ID = 'show1';
  process.env.YOUTUBE_CHANNEL_ID = 'channel1';
  delete process.env.MOCK_DATA;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getEpisodes', () => {
  it('returns the fresh cached snapshot without calling external APIs', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue([episode({ id: 'ep1' })]);

    const result = await getEpisodes();

    expect(result).toHaveLength(1);
    expect(fetchAllSpotifyEpisodes).not.toHaveBeenCalled();
  });

  it('builds fresh data, matching new episodes against youtube uploads once', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(getLastGoodEpisodes).mockResolvedValue(null);
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

  it('uses a cached youtube match without recomputing or re-caching it', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(getLastGoodEpisodes).mockResolvedValue(null);
    vi.mocked(fetchAllSpotifyEpisodes).mockResolvedValue([
      { id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01', durationMs: 1, spotifyUrl: 'x' },
    ]);
    vi.mocked(fetchChannelUploads).mockResolvedValue([]);
    vi.mocked(getCachedYoutubeMatch).mockResolvedValue({ videoId: 'vid1', status: 'confirmed', score: 0.9 });

    const result = await getEpisodes();

    expect(result[0].youtubeVideoId).toBe('vid1');
    expect(result[0].youtubeMatchStatus).toBe('confirmed');
    expect(matchEpisodeToUpload).not.toHaveBeenCalled();
    expect(setCachedYoutubeMatch).not.toHaveBeenCalled();
  });

  it('reuses matches from the last-good snapshot without any per-episode KV reads', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(getLastGoodEpisodes).mockResolvedValue([
      episode({ id: 'ep1', youtubeVideoId: 'vid1', youtubeMatchStatus: 'confirmed' }),
      episode({ id: 'ep2', youtubeVideoId: 'vid2', youtubeMatchStatus: 'low_confidence' }),
    ]);
    vi.mocked(fetchAllSpotifyEpisodes).mockResolvedValue([
      { id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01', durationMs: 1, spotifyUrl: 'x' },
      { id: 'ep2', slug: 'ep-2', title: 'Ep 2', description: '', releaseDate: '2026-01-02', durationMs: 1, spotifyUrl: 'y' },
    ]);
    vi.mocked(fetchChannelUploads).mockResolvedValue([]);

    const result = await getEpisodes();

    expect(getCachedYoutubeMatch).not.toHaveBeenCalled();
    expect(matchEpisodeToUpload).not.toHaveBeenCalled();
    expect(setCachedYoutubeMatch).not.toHaveBeenCalled();
    expect(getLastGoodEpisodes).toHaveBeenCalledTimes(1);
    const ep1 = result.find((e) => e.id === 'ep1')!;
    const ep2 = result.find((e) => e.id === 'ep2')!;
    expect(ep1.youtubeVideoId).toBe('vid1');
    expect(ep2.youtubeMatchStatus).toBe('low_confidence');
  });

  it('still matches and caches an episode that is new since the last-good snapshot', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(getLastGoodEpisodes).mockResolvedValue([
      episode({ id: 'ep1', youtubeVideoId: 'vid1', youtubeMatchStatus: 'confirmed' }),
    ]);
    vi.mocked(fetchAllSpotifyEpisodes).mockResolvedValue([
      { id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01', durationMs: 1, spotifyUrl: 'x' },
      { id: 'ep2', slug: 'ep-2', title: 'Ep 2', description: '', releaseDate: '2026-01-02', durationMs: 1, spotifyUrl: 'y' },
    ]);
    vi.mocked(fetchChannelUploads).mockResolvedValue([]);
    vi.mocked(getCachedYoutubeMatch).mockResolvedValue(null);
    vi.mocked(matchEpisodeToUpload).mockReturnValue({ videoId: 'vid2', status: 'confirmed', score: 0.95 });

    const result = await getEpisodes();

    // Only the new episode triggered KV/matching work.
    expect(getCachedYoutubeMatch).toHaveBeenCalledTimes(1);
    expect(getCachedYoutubeMatch).toHaveBeenCalledWith('ep2');
    expect(matchEpisodeToUpload).toHaveBeenCalledTimes(1);
    expect(setCachedYoutubeMatch).toHaveBeenCalledWith('ep2', { videoId: 'vid2', status: 'confirmed', score: 0.95 });
    expect(result.find((e) => e.id === 'ep2')!.youtubeVideoId).toBe('vid2');
  });

  it('sorts episodes newest-first regardless of the order Spotify returns them', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(getLastGoodEpisodes).mockResolvedValue(null);
    vi.mocked(fetchAllSpotifyEpisodes).mockResolvedValue([
      { id: 'old', slug: 'old', title: 'Old', description: '', releaseDate: '2020-05-05', durationMs: 1, spotifyUrl: 'x' },
      { id: 'new', slug: 'new', title: 'New', description: '', releaseDate: '2026-02-02', durationMs: 1, spotifyUrl: 'y' },
      { id: 'mid', slug: 'mid', title: 'Mid', description: '', releaseDate: '2023-01-01', durationMs: 1, spotifyUrl: 'z' },
    ]);
    vi.mocked(fetchChannelUploads).mockResolvedValue([]);
    vi.mocked(getCachedYoutubeMatch).mockResolvedValue({ videoId: null, status: 'none', score: 0 });

    const result = await getEpisodes();

    expect(result.map((e) => e.id)).toEqual(['new', 'mid', 'old']);
  });

  it('falls back to the last-good snapshot when a live fetch fails', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(fetchAllSpotifyEpisodes).mockRejectedValue(new Error('Spotify down'));
    vi.mocked(getLastGoodEpisodes).mockResolvedValue([episode({ id: 'ep1' })]);

    const result = await getEpisodes();

    expect(result).toHaveLength(1);
  });

  it('catches a getFreshEpisodes (KV) failure and still stale-serves', async () => {
    vi.mocked(getFreshEpisodes).mockRejectedValue(new Error('KV down'));
    vi.mocked(getLastGoodEpisodes).mockResolvedValue([episode({ id: 'ep1' })]);

    const result = await getEpisodes();

    expect(result).toHaveLength(1);
    expect(fetchAllSpotifyEpisodes).not.toHaveBeenCalled();
  });

  it('re-throws the ORIGINAL error when the fallback read itself fails', async () => {
    vi.mocked(getFreshEpisodes).mockRejectedValue(new Error('KV down'));
    vi.mocked(getLastGoodEpisodes).mockRejectedValue(new Error('fallback also down'));

    await expect(getEpisodes()).rejects.toThrow('KV down');
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

describe('getRetroList', () => {
  const items = [{ id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', submittedBy: 'A', notes: '' }];

  it('returns the cached list without hitting Sheets', async () => {
    vi.mocked(getCachedRetroList).mockResolvedValue(items);

    expect(await getRetroList()).toEqual(items);
    expect(fetchRetroListRows).not.toHaveBeenCalled();
  });

  it('stale-serves the last cached list when the live Sheets fetch fails', async () => {
    vi.mocked(getCachedRetroList).mockResolvedValueOnce(null).mockResolvedValueOnce(items);
    vi.mocked(fetchRetroListRows).mockRejectedValue(new Error('Sheets down'));

    expect(await getRetroList()).toEqual(items);
  });

  it('re-throws when the fetch fails and there is no cached list', async () => {
    vi.mocked(getCachedRetroList).mockResolvedValue(null);
    vi.mocked(fetchRetroListRows).mockRejectedValue(new Error('Sheets down'));

    await expect(getRetroList()).rejects.toThrow('Sheets down');
  });

  it('re-throws the ORIGINAL error when the fallback cache read also fails', async () => {
    vi.mocked(getCachedRetroList)
      .mockRejectedValueOnce(new Error('KV down'))
      .mockRejectedValueOnce(new Error('fallback also down'));

    await expect(getRetroList()).rejects.toThrow('KV down');
  });
});

describe('refreshRetroList', () => {
  it('caches a successfully mapped list', async () => {
    const items = [{ id: 'row-0', game: 'Metroid', platform: 'NES', submittedBy: 'B', notes: '' }];
    vi.mocked(fetchRetroListRows).mockResolvedValue([['game'], ['Metroid']]);
    vi.mocked(mapSheetRowsToRetroList).mockReturnValue(items);

    expect(await refreshRetroList()).toEqual(items);
    expect(setCachedRetroList).toHaveBeenCalledWith(items);
  });

  it('caches an empty result when the sheet genuinely has no data rows', async () => {
    vi.mocked(fetchRetroListRows).mockResolvedValue([['game', 'platform']]);
    vi.mocked(mapSheetRowsToRetroList).mockReturnValue([]);

    expect(await refreshRetroList()).toEqual([]);
    expect(setCachedRetroList).toHaveBeenCalledWith([]);
  });

  it('does NOT cache an empty result caused by a column-mapping failure', async () => {
    vi.mocked(fetchRetroListRows).mockResolvedValue([
      ['Game Title', 'System'],
      ['Chrono Trigger', 'SNES'],
    ]);
    vi.mocked(mapSheetRowsToRetroList).mockReturnValue([]);
    vi.mocked(getCachedRetroList).mockResolvedValue(null);

    expect(await refreshRetroList()).toEqual([]);
    expect(setCachedRetroList).not.toHaveBeenCalled();
  });

  it('keeps serving the previous cached list on a mapping failure', async () => {
    const previous = [{ id: 'row-0', game: 'Metroid', platform: 'NES', submittedBy: 'B', notes: '' }];
    vi.mocked(fetchRetroListRows).mockResolvedValue([
      ['Game Title', 'System'],
      ['Chrono Trigger', 'SNES'],
    ]);
    vi.mocked(mapSheetRowsToRetroList).mockReturnValue([]);
    vi.mocked(getCachedRetroList).mockResolvedValue(previous);

    expect(await refreshRetroList()).toEqual(previous);
    expect(setCachedRetroList).not.toHaveBeenCalled();
  });
});
