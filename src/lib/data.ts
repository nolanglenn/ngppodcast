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

export async function getEpisodes(): Promise<Episode[]> {
  if (process.env.MOCK_DATA === 'true') return mockEpisodes;

  const fresh = await getFreshEpisodes();
  if (fresh) return fresh;

  try {
    const showId = getRequiredEnv('SPOTIFY_SHOW_ID');
    const channelId = getRequiredEnv('YOUTUBE_CHANNEL_ID');

    const baseEpisodes = await fetchAllSpotifyEpisodes(showId);
    const uploads = await fetchChannelUploads(channelId);

    const episodes: Episode[] = [];
    for (const base of baseEpisodes) {
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

    await setEpisodesSnapshot(episodes);
    return episodes;
  } catch (err) {
    const lastGood = await getLastGoodEpisodes();
    if (lastGood) return lastGood;
    throw err;
  }
}

export async function getEpisodeBySlug(slug: string): Promise<Episode | null> {
  const episodes = await getEpisodes();
  return episodes.find((e) => e.slug === slug) ?? null;
}

export async function getRetroList(): Promise<RetroListItem[]> {
  if (process.env.MOCK_DATA === 'true') return mockRetroList;

  const cached = await getCachedRetroList();
  if (cached) return cached;
  return refreshRetroList();
}

export async function refreshRetroList(): Promise<RetroListItem[]> {
  const rows = await fetchRetroListRows();
  const items = mapSheetRowsToRetroList(rows);
  await setCachedRetroList(items);
  return items;
}
