import { fetchAllSpotifyEpisodes } from './spotify';
import { fetchChannelUploads, matchEpisodeToUpload } from './youtube';
import { fetchRetroListRows, mapSheetRowsToRetroList } from './sheets';
import {
  getFreshEpisodes,
  getLastGoodEpisodes,
  setEpisodesSnapshot,
  getCachedYoutubeMatch,
  setCachedYoutubeMatch,
  getCachedRetroList,
  setCachedRetroList,
} from './cache';
import { getRequiredEnv } from './env';
import { mockEpisodes, mockRetroList } from './mockData';
import type { Episode, RetroListItem } from './types';

type KnownMatch = Pick<Episode, 'youtubeVideoId' | 'youtubeMatchStatus'>;

/**
 * Read the last-good snapshot and index it by episode id so the rebuild loop can
 * reuse already-resolved YouTube matches instead of issuing one KV read per
 * episode (~600 round trips per rebuild cycle otherwise).
 *
 * Returns null when there is no snapshot yet (first-ever run / cold KV) or when
 * the read itself fails — callers then fall back to per-episode cache lookups.
 */
async function loadKnownMatches(): Promise<Map<string, KnownMatch> | null> {
  let lastGood: Episode[] | null;
  try {
    lastGood = await getLastGoodEpisodes();
  } catch (err) {
    console.error('[data] failed to read last-good snapshot for match reuse', err);
    return null;
  }
  if (!lastGood) return null;
  return new Map(
    lastGood.map((e) => [
      e.id,
      { youtubeVideoId: e.youtubeVideoId, youtubeMatchStatus: e.youtubeMatchStatus },
    ])
  );
}

export async function getEpisodes(): Promise<Episode[]> {
  if (process.env.MOCK_DATA === 'true') return mockEpisodes;

  try {
    const fresh = await getFreshEpisodes();
    if (fresh) return fresh;

    const showId = getRequiredEnv('SPOTIFY_SHOW_ID');
    const channelId = getRequiredEnv('YOUTUBE_CHANNEL_ID');

    const baseEpisodes = await fetchAllSpotifyEpisodes(showId);
    const uploads = await fetchChannelUploads(channelId);

    // One snapshot read replaces ~600 per-episode KV reads. Only episodes that
    // are genuinely new since the last snapshot need a cache lookup / match.
    const knownMatches = await loadKnownMatches();

    const episodes: Episode[] = [];
    for (const base of baseEpisodes) {
      const known = knownMatches?.get(base.id);
      if (known) {
        episodes.push({ ...base, ...known });
        continue;
      }

      let match = await getCachedYoutubeMatch(base.id);
      if (!match) {
        match = matchEpisodeToUpload(base, uploads);
        await setCachedYoutubeMatch(base.id, match);
      }
      episodes.push({
        ...base,
        youtubeVideoId: match.status === 'none' ? null : match.videoId,
        youtubeMatchStatus: match.status,
      });
    }

    // Explicit newest-first ordering: the home page's "latest episode" and the
    // archive's default order must not depend on Spotify's response order.
    episodes.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

    await setEpisodesSnapshot(episodes);
    return episodes;
  } catch (err) {
    console.error('[data] getEpisodes failed; attempting stale-serve fallback', err);
    try {
      const lastGood = await getLastGoodEpisodes();
      if (lastGood) return lastGood;
    } catch (fallbackErr) {
      // Preserve the original failure — do not let the fallback read mask it.
      console.error('[data] stale-serve fallback read also failed', fallbackErr);
    }
    throw err;
  }
}

export async function getEpisodeBySlug(slug: string): Promise<Episode | null> {
  const episodes = await getEpisodes();
  return episodes.find((e) => e.slug === slug) ?? null;
}

export async function getRetroList(): Promise<RetroListItem[]> {
  if (process.env.MOCK_DATA === 'true') return mockRetroList;

  try {
    const cached = await getCachedRetroList();
    if (cached) return cached;
    return await refreshRetroList();
  } catch (err) {
    console.error('[data] getRetroList failed; attempting stale-serve fallback', err);
    try {
      const cached = await getCachedRetroList();
      if (cached) return cached;
    } catch (fallbackErr) {
      // Preserve the original failure — do not let the fallback read mask it.
      console.error('[data] retro list stale-serve fallback read also failed', fallbackErr);
    }
    throw err;
  }
}

export async function refreshRetroList(): Promise<RetroListItem[]> {
  const rows = await fetchRetroListRows();
  const items = mapSheetRowsToRetroList(rows);

  // rows.length > 1 means there was a header plus at least one data row. Mapping
  // those to zero items means the header didn't match the expected column names,
  // not that the sheet is empty — caching that would freeze the page empty forever.
  if (items.length === 0 && rows.length > 1) {
    console.error(
      `[data] Retro List mapping produced 0 items from ${rows.length - 1} data rows — ` +
        'likely a header/column mismatch. Not caching; will retry on the next request.'
    );
    const cached = await getCachedRetroList();
    return cached ?? items;
  }

  await setCachedRetroList(items);
  return items;
}
