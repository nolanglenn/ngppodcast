import { describe, it, expect, vi, beforeEach } from 'vitest';

const kvMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  sadd: vi.fn(),
  smembers: vi.fn(),
}));

vi.mock('@vercel/kv', () => ({ kv: kvMock }));

import {
  getFreshEpisodes,
  getLastGoodEpisodes,
  setEpisodesSnapshot,
  getCachedYoutubeMatch,
  setCachedYoutubeMatch,
  getLowConfidenceEpisodeIds,
  getCachedRetroList,
  setCachedRetroList,
} from './cache';

const sampleEpisodes = [
  {
    id: 'ep1',
    slug: 'ep-1',
    title: 'Ep 1',
    description: '',
    releaseDate: '2026-01-01',
    durationMs: 1,
    spotifyUrl: 'x',
    youtubeVideoId: null,
    youtubeMatchStatus: 'none' as const,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('episode snapshot cache', () => {
  it('getFreshEpisodes returns null when the freshness marker is absent', async () => {
    kvMock.get.mockResolvedValueOnce(null); // fresh marker
    const result = await getFreshEpisodes();
    expect(result).toBeNull();
  });

  it('getFreshEpisodes returns the snapshot when the freshness marker is present', async () => {
    kvMock.get.mockResolvedValueOnce(true); // fresh marker
    kvMock.get.mockResolvedValueOnce(sampleEpisodes); // snapshot
    const result = await getFreshEpisodes();
    expect(result).toEqual(sampleEpisodes);
  });

  it('setEpisodesSnapshot writes the snapshot and a TTL-bound freshness marker', async () => {
    await setEpisodesSnapshot(sampleEpisodes);
    expect(kvMock.set).toHaveBeenCalledWith('episodes:v1:snapshot', sampleEpisodes);
    expect(kvMock.set).toHaveBeenCalledWith('episodes:v1:fresh', true, { ex: 300 });
  });

  it('getLastGoodEpisodes reads the snapshot regardless of freshness', async () => {
    kvMock.get.mockResolvedValueOnce(sampleEpisodes);
    const result = await getLastGoodEpisodes();
    expect(result).toEqual(sampleEpisodes);
    expect(kvMock.get).toHaveBeenCalledWith('episodes:v1:snapshot');
  });
});

describe('youtube match cache', () => {
  it('stores a low-confidence match and logs it for review', async () => {
    await setCachedYoutubeMatch('ep1', { videoId: 'vid1', status: 'low_confidence', score: 0.4 });
    expect(kvMock.set).toHaveBeenCalledWith('youtube-match:v1:ep1', {
      videoId: 'vid1',
      status: 'low_confidence',
      score: 0.4,
    });
    expect(kvMock.sadd).toHaveBeenCalledWith('youtube-match:v1:low-confidence-log', 'ep1');
  });

  it('does not log a confirmed match', async () => {
    await setCachedYoutubeMatch('ep1', { videoId: 'vid1', status: 'confirmed', score: 0.9 });
    expect(kvMock.sadd).not.toHaveBeenCalled();
  });

  it('getLowConfidenceEpisodeIds returns the logged set', async () => {
    kvMock.smembers.mockResolvedValueOnce(['ep1', 'ep2']);
    expect(await getLowConfidenceEpisodeIds()).toEqual(['ep1', 'ep2']);
  });

  it('getCachedYoutubeMatch reads by episode id', async () => {
    kvMock.get.mockResolvedValueOnce({ videoId: 'vid1', status: 'confirmed', score: 0.9 });
    const result = await getCachedYoutubeMatch('ep1');
    expect(result).toEqual({ videoId: 'vid1', status: 'confirmed', score: 0.9 });
    expect(kvMock.get).toHaveBeenCalledWith('youtube-match:v1:ep1');
  });
});

describe('retro list cache', () => {
  it('round-trips through get/set with no TTL', async () => {
    const items = [{ id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', submittedBy: 'A', notes: '' }];
    await setCachedRetroList(items);
    expect(kvMock.set).toHaveBeenCalledWith('retro-list:v1', items);

    kvMock.get.mockResolvedValueOnce(items);
    expect(await getCachedRetroList()).toEqual(items);
  });
});
