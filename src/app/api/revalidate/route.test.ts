import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/data', () => ({ refreshRetroList: vi.fn() }));
import { refreshRetroList } from '@/lib/data';
import { GET } from './route';

describe('GET /api/revalidate', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.REVALIDATE_SECRET = 'webhook-secret';
    process.env.CRON_SECRET = 'cron-secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects requests with no valid secret or cron header', async () => {
    const req = new NextRequest('http://localhost/api/revalidate');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('rejects a request with the WRONG query secret', async () => {
    const req = new NextRequest('http://localhost/api/revalidate?secret=not-the-secret');
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(refreshRetroList).not.toHaveBeenCalled();
  });

  it('rejects a request with the WRONG Authorization bearer token', async () => {
    const req = new NextRequest('http://localhost/api/revalidate', {
      headers: { authorization: 'Bearer not-the-cron-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(refreshRetroList).not.toHaveBeenCalled();
  });

  it('accepts the Apps Script webhook via query secret', async () => {
    vi.mocked(refreshRetroList).mockResolvedValue([{ id: 'row-0', game: 'G', platform: 'P', releaseYear: '1995', episodeNumber: '1' }]);
    const req = new NextRequest('http://localhost/api/revalidate?secret=webhook-secret');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 1 });
  });

  it('accepts Vercel Cron via the Authorization header', async () => {
    vi.mocked(refreshRetroList).mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/revalidate', {
      headers: { authorization: 'Bearer cron-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('returns 503 when the refresh fails', async () => {
    vi.mocked(refreshRetroList).mockRejectedValue(new Error('Sheets down'));
    const req = new NextRequest('http://localhost/api/revalidate?secret=webhook-secret');
    const res = await GET(req);
    expect(res.status).toBe(503);
  });
});
