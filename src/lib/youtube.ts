import { getRequiredEnv } from './env';
import { titleSimilarity } from './similarity';
import type { YoutubeUpload, YoutubeMatchResult } from './types';

interface YoutubeChannelResponse {
  items: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
}

interface YoutubePlaylistItemsResponse {
  items: {
    snippet: { title: string; publishedAt: string; resourceId: { videoId: string } };
  }[];
  nextPageToken?: string;
}

export async function fetchChannelUploads(
  channelId: string,
  fetchImpl: typeof fetch = fetch
): Promise<YoutubeUpload[]> {
  const apiKey = getRequiredEnv('YOUTUBE_API_KEY');

  const channelRes = await fetchImpl(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
  );
  if (!channelRes.ok) throw new Error(`YouTube channel request failed: ${channelRes.status}`);
  const channelData = (await channelRes.json()) as YoutubeChannelResponse;
  const uploadsPlaylistId = channelData.items[0]?.contentDetails.relatedPlaylists.uploads;
  if (!uploadsPlaylistId) throw new Error('No uploads playlist found for channel');

  const uploads: YoutubeUpload[] = [];
  let pageToken = '';
  do {
    const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
    const res = await fetchImpl(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}${pageParam}`
    );
    if (!res.ok) throw new Error(`YouTube playlist items request failed: ${res.status}`);
    const data = (await res.json()) as YoutubePlaylistItemsResponse;
    for (const item of data.items) {
      uploads.push({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
      });
    }
    pageToken = data.nextPageToken ?? '';
  } while (pageToken);

  return uploads;
}

const CONFIRMED_THRESHOLD = 0.6;
const LOW_CONFIDENCE_THRESHOLD = 0.35;
const MAX_DATE_DIFF_DAYS = 10;
const DAY_MS = 86_400_000;

export function matchEpisodeToUpload(
  episode: { title: string; releaseDate: string },
  uploads: YoutubeUpload[]
): YoutubeMatchResult {
  const episodeDateMs = new Date(episode.releaseDate).getTime();
  let best: { upload: YoutubeUpload; score: number } | null = null;

  for (const upload of uploads) {
    const dateDiffDays = Math.abs(new Date(upload.publishedAt).getTime() - episodeDateMs) / DAY_MS;
    if (dateDiffDays > MAX_DATE_DIFF_DAYS) continue;

    const score = titleSimilarity(episode.title, upload.title);
    if (!best || score > best.score) best = { upload, score };
  }

  if (!best) return { videoId: null, status: 'none', score: 0 };
  if (best.score >= CONFIRMED_THRESHOLD) {
    return { videoId: best.upload.videoId, status: 'confirmed', score: best.score };
  }
  if (best.score >= LOW_CONFIDENCE_THRESHOLD) {
    return { videoId: best.upload.videoId, status: 'low_confidence', score: best.score };
  }
  return { videoId: null, status: 'none', score: best.score };
}
