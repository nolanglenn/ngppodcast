import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/cache', () => ({ getLowConfidenceEpisodeIds: vi.fn() }));
vi.mock('@/lib/data', () => ({ getEpisodes: vi.fn() }));
import { getLowConfidenceEpisodeIds } from '@/lib/cache';
import { getEpisodes } from '@/lib/data';
import { GET } from './route';

describe('GET /api/admin/low-confidence-matches', () => {
  beforeEach(() => {
    process.env.REVALIDATE_SECRET = 'admin-secret';
  });

  it('rejects requests without the secret', async () => {
    const req = new NextRequest('http://localhost/api/admin/low-confidence-matches');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns only flagged episodes when the secret matches', async () => {
    vi.mocked(getLowConfidenceEpisodeIds).mockResolvedValue(['ep2']);
    vi.mocked(getEpisodes).mockResolvedValue([
      { id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01', durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none' },
      { id: 'ep2', slug: 'ep-2', title: 'Ep 2', description: '', releaseDate: '2026-01-02', durationMs: 1, spotifyUrl: 'y', youtubeVideoId: 'vid2', youtubeMatchStatus: 'low_confidence' },
    ]);

    const req = new NextRequest('http://localhost/api/admin/low-confidence-matches?secret=admin-secret');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('ep2');
  });

  it('returns 503 when getEpisodes throws', async () => {
    vi.mocked(getLowConfidenceEpisodeIds).mockResolvedValue([]);
    vi.mocked(getEpisodes).mockRejectedValue(new Error('down'));

    const req = new NextRequest('http://localhost/api/admin/low-confidence-matches?secret=admin-secret');
    const res = await GET(req);

    expect(res.status).toBe(503);
  });
});
