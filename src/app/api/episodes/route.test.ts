import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/data', () => ({ getEpisodes: vi.fn() }));
import { getEpisodes } from '@/lib/data';
import { GET } from './route';

describe('GET /api/episodes', () => {
  it('returns episodes as JSON', async () => {
    vi.mocked(getEpisodes).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns 503 when getEpisodes throws', async () => {
    vi.mocked(getEpisodes).mockRejectedValue(new Error('down'));
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
