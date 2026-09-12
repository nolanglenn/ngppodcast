import { NextRequest, NextResponse } from 'next/server';
import { refreshRetroList } from '@/lib/data';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const isCron = Boolean(process.env.CRON_SECRET) && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const secretParam = request.nextUrl.searchParams.get('secret');
  const isWebhook = Boolean(process.env.REVALIDATE_SECRET) && secretParam === process.env.REVALIDATE_SECRET;

  if (!isCron && !isWebhook) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await refreshRetroList();
    return NextResponse.json({ ok: true, count: items.length });
  } catch (err) {
    console.error('[api/revalidate] retro list refresh failed', err);
    return NextResponse.json({ error: 'Refresh failed' }, { status: 503 });
  }
}
