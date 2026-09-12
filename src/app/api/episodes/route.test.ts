import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/data', () => ({ getEpisodes: vi.fn() }));
import { getEpisodes } from '@/lib/data';
import { GET, dynamic } from './route';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/episodes', () => {
  it('is force-dynamic so it is not frozen at build time', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('returns episodes as JSON', async () => {
    vi.mocked(getEpisodes).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('nulls the videoId of non-confirmed matches but keeps confirmed ones', async () => {
    vi.mocked(getEpisodes).mockResolvedValue([
      { id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01', durationMs: 1, spotifyUrl: 'x', youtubeVideoId: 'vid1', youtubeMatchStatus: 'confirmed' },
      { id: 'ep2', slug: 'ep-2', title: 'Ep 2', description: '', releaseDate: '2026-01-02', durationMs: 1, spotifyUrl: 'y', youtubeVideoId: 'vid2', youtubeMatchStatus: 'low_confidence' },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(body[0].youtubeVideoId).toBe('vid1');
    expect(body[1].youtubeVideoId).toBeNull();
    expect(body[1].youtubeMatchStatus).toBe('low_confidence');
  });

  it('returns 503 when getEpisodes throws', async () => {
    vi.mocked(getEpisodes).mockRejectedValue(new Error('down'));
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
