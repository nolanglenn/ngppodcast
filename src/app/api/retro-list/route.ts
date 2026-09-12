import { NextResponse } from 'next/server';
import { getRetroList } from '@/lib/data';

// Without this Next 14 would statically prerender this route at build time,
// when no API credentials or KV connection exist — freezing a 503 forever.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await getRetroList();
    return NextResponse.json(items);
  } catch (err) {
    console.error('[api/retro-list] failed to load the retro list', err);
    return NextResponse.json({ error: 'Retro list temporarily unavailable' }, { status: 503 });
  }
}
