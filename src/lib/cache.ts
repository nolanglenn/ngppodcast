import { kv } from '@vercel/kv';
import type { Episode, RetroListItem, YoutubeMatchResult } from './types';

const EPISODES_SNAPSHOT_KEY = 'episodes:v1:snapshot';
const EPISODES_FRESH_KEY = 'episodes:v1:fresh';
const EPISODES_TTL_SECONDS = 300; // 5 min

const YOUTUBE_MATCH_KEY = (episodeId: string) => `youtube-match:${episodeId}`;
const LOW_CONFIDENCE_LOG_KEY = 'youtube-match:low-confidence-log';

const RETRO_LIST_KEY = 'retro-list:v1';

export async function getFreshEpisodes(): Promise<Episode[] | null> {
  const isFresh = await kv.get(EPISODES_FRESH_KEY);
  if (!isFresh) return null;
  return (await kv.get<Episode[]>(EPISODES_SNAPSHOT_KEY)) ?? null;
}

export async function getLastGoodEpisodes(): Promise<Episode[] | null> {
  return (await kv.get<Episode[]>(EPISODES_SNAPSHOT_KEY)) ?? null;
}

export async function setEpisodesSnapshot(episodes: Episode[]): Promise<void> {
  await kv.set(EPISODES_SNAPSHOT_KEY, episodes);
  await kv.set(EPISODES_FRESH_KEY, true, { ex: EPISODES_TTL_SECONDS });
}

export async function getCachedYoutubeMatch(episodeId: string): Promise<YoutubeMatchResult | null> {
  return (await kv.get<YoutubeMatchResult>(YOUTUBE_MATCH_KEY(episodeId))) ?? null;
}

export async function setCachedYoutubeMatch(episodeId: string, match: YoutubeMatchResult): Promise<void> {
  await kv.set(YOUTUBE_MATCH_KEY(episodeId), match);
  if (match.status === 'low_confidence') {
    await kv.sadd(LOW_CONFIDENCE_LOG_KEY, episodeId);
  }
}

export async function getLowConfidenceEpisodeIds(): Promise<string[]> {
  return (await kv.smembers<string>(LOW_CONFIDENCE_LOG_KEY)) ?? [];
}

export async function getCachedRetroList(): Promise<RetroListItem[] | null> {
  return (await kv.get<RetroListItem[]>(RETRO_LIST_KEY)) ?? null;
}

export async function setCachedRetroList(items: RetroListItem[]): Promise<void> {
  await kv.set(RETRO_LIST_KEY, items);
}
