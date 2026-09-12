import { NextRequest, NextResponse } from 'next/server';
import { getLowConfidenceEpisodeIds } from '@/lib/cache';
import { getEpisodes } from '@/lib/data';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ids = await getLowConfidenceEpisodeIds();
    const episodes = await getEpisodes();
    const flagged = episodes.filter((e) => ids.includes(e.id));
    return NextResponse.json(flagged);
  } catch {
    return NextResponse.json({ error: 'Low-confidence matches temporarily unavailable' }, { status: 503 });
  }
}
