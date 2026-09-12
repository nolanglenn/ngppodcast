import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/data', () => ({ getRetroList: vi.fn() }));
import { getRetroList } from '@/lib/data';
import { GET } from './route';

describe('GET /api/retro-list', () => {
  it('returns retro list items as JSON', async () => {
    vi.mocked(getRetroList).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns 503 when getRetroList throws', async () => {
    vi.mocked(getRetroList).mockRejectedValue(new Error('down'));
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
