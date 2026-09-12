export interface Episode {
  id: string;
  slug: string;
  title: string;
  description: string;
  releaseDate: string; // ISO 8601 date, e.g. "2026-01-01"
  durationMs: number;
  spotifyUrl: string;
  youtubeVideoId: string | null;
  youtubeMatchStatus: 'confirmed' | 'low_confidence' | 'none';
}

export interface RetroListItem {
  id: string;
  game: string;
  platform: string;
  submittedBy: string;
  notes: string;
}

export interface YoutubeUpload {
  videoId: string;
  title: string;
  publishedAt: string; // ISO 8601 datetime
}

export interface YoutubeMatchResult {
  videoId: string | null;
  status: 'confirmed' | 'low_confidence' | 'none';
  score: number;
}
