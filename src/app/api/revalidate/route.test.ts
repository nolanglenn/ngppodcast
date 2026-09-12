import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/data', () => ({ refreshRetroList: vi.fn() }));
import { refreshRetroList } from '@/lib/data';
import { GET } from './route';

describe('GET /api/revalidate', () => {
  beforeEachEnv();

  function beforeEachEnv() {
    process.env.REVALIDATE_SECRET = 'webhook-secret';
    process.env.CRON_SECRET = 'cron-secret';
  }

  it('rejects requests with no valid secret or cron header', async () => {
    const req = new NextRequest('http://localhost/api/revalidate');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('accepts the Apps Script webhook via query secret', async () => {
    vi.mocked(refreshRetroList).mockResolvedValue([{ id: 'row-0', game: 'G', platform: 'P', submittedBy: 'S', notes: '' }]);
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
});
