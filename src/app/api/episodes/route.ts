import { NextResponse } from 'next/server';
import { getEpisodes } from '@/lib/data';

export async function GET() {
  try {
    const episodes = await getEpisodes();
    return NextResponse.json(episodes);
  } catch {
    return NextResponse.json({ error: 'Episodes temporarily unavailable' }, { status: 503 });
  }
}
