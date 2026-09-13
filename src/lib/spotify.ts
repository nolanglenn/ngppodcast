import { getRequiredEnv } from './env';
import { episodeSlug, ensureUniqueSlugs } from './slug';
import type { Episode } from './types';

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface SpotifyEpisodeItem {
  id: string;
  name: string;
  description: string;
  release_date: string;
  duration_ms: number;
  external_urls: { spotify: string };
}

interface SpotifyEpisodesPage {
  // Spotify's API returns a null entry for episodes not available in the
  // API's market (e.g. region-restricted) — skip those rather than crash.
  items: (SpotifyEpisodeItem | null)[];
  next: string | null;
}

type BaseEpisode = Omit<Episode, 'youtubeVideoId' | 'youtubeMatchStatus'>;

async function getSpotifyAccessToken(fetchImpl: typeof fetch): Promise<string> {
  const clientId = getRequiredEnv('SPOTIFY_CLIENT_ID');
  const clientSecret = getRequiredEnv('SPOTIFY_CLIENT_SECRET');
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetchImpl('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
  const data = (await res.json()) as SpotifyTokenResponse;
  return data.access_token;
}

function mapSpotifyEpisode(item: SpotifyEpisodeItem): BaseEpisode {
  return {
    id: item.id,
    slug: episodeSlug(item.name, item.id),
    title: item.name,
    description: item.description,
    releaseDate: item.release_date,
    durationMs: item.duration_ms,
    spotifyUrl: item.external_urls.spotify,
  };
}

export async function fetchAllSpotifyEpisodes(
  showId: string,
  fetchImpl: typeof fetch = fetch
): Promise<BaseEpisode[]> {
  const token = await getSpotifyAccessToken(fetchImpl);
  const items: SpotifyEpisodeItem[] = [];
  let url: string | null = `https://api.spotify.com/v1/shows/${showId}/episodes?limit=50`;

  while (url) {
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Spotify episodes request failed: ${res.status}`);
    const page = (await res.json()) as SpotifyEpisodesPage;
    items.push(...page.items.filter((item): item is SpotifyEpisodeItem => item !== null));
    url = page.next;
  }

  // Dedup needs to see every episode at once, so it happens here rather than in
  // mapSpotifyEpisode (which only ever sees a single episode).
  return ensureUniqueSlugs(items.map(mapSpotifyEpisode));
}
