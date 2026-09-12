import { NextRequest, NextResponse } from 'next/server';
import { getLowConfidenceEpisodeIds } from '@/lib/cache';
import { getEpisodes } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Deliberately NOT REVALIDATE_SECRET: that one is pasted into the Google Apps
  // Script, so anyone with Sheet-edit access can read it.
  const secret = request.nextUrl.searchParams.get('secret');
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ids = await getLowConfidenceEpisodeIds();
    const episodes = await getEpisodes();
    const flagged = episodes.filter((e) => ids.includes(e.id));
    return NextResponse.json(flagged);
  } catch (err) {
    console.error('[api/admin/low-confidence-matches] failed to load flagged matches', err);
    return NextResponse.json({ error: 'Low-confidence matches temporarily unavailable' }, { status: 503 });
  }
}
