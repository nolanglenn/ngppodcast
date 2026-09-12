import { NextResponse } from 'next/server';
import { getEpisodes } from '@/lib/data';

// Without this Next 14 would statically prerender this route at build time,
// when no API credentials or KV connection exist — freezing a 503 forever.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const episodes = await getEpisodes();
    // Unconfirmed matches must never be exposed publicly. The data layer keeps
    // the videoId for low-confidence matches so the admin route can review them;
    // this public JSON surface strips it.
    const publicEpisodes = episodes.map((e) =>
      e.youtubeMatchStatus === 'confirmed' ? e : { ...e, youtubeVideoId: null }
    );
    return NextResponse.json(publicEpisodes);
  } catch (err) {
    console.error('[api/episodes] failed to load episodes', err);
    return NextResponse.json({ error: 'Episodes temporarily unavailable' }, { status: 503 });
  }
}
