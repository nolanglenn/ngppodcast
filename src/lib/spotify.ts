import { getRequiredEnv } from './env';
import { slugify } from './slug';
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
  items: SpotifyEpisodeItem[];
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
    slug: slugify(item.name),
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
    items.push(...page.items);
    url = page.next;
  }

  return items.map(mapSpotifyEpisode);
}
