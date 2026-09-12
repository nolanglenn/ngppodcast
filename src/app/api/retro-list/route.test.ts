import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/data', () => ({ getRetroList: vi.fn() }));
import { getRetroList } from '@/lib/data';
import { GET, dynamic } from './route';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/retro-list', () => {
  it('is force-dynamic so it is not frozen at build time', () => {
    expect(dynamic).toBe('force-dynamic');
  });

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
