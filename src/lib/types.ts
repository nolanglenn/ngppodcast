export interface Episode {
  id: string;
  slug: string;
  title: string;
  description: string;
  /**
   * Spotify's `html_description` — the same show notes as `description`, but with
   * paragraph/line structure intact. Spotify's plain `description` field strips all
   * separators (verified against real episodes: no `\n`, no space between segments),
   * so this is what should actually be rendered; `description` is a plain-text
   * fallback. Optional so existing fixtures/mocks don't need updating.
   */
  descriptionHtml?: string;
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
  /** The game's original release year, e.g. "1994". Free text — the sheet doesn't constrain it. */
  releaseYear: string;
  /** Which episode # featured this game, e.g. "541". Not (yet) linked to an episode slug. */
  episodeNumber: string;
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
