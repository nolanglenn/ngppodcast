import { NextResponse } from 'next/server';
import { getRetroList } from '@/lib/data';

export async function GET() {
  try {
    const items = await getRetroList();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: 'Retro list temporarily unavailable' }, { status: 503 });
  }
}
