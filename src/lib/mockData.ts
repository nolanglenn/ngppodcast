import type { Episode, RetroListItem } from './types';

export const mockEpisodes: Episode[] = [
  {
    id: 'mock-ep-1',
    slug: 'mock-episode-one',
    title: 'Mock Episode One',
    description: 'A fixture episode used for local/e2e testing.',
    releaseDate: '2026-01-01',
    durationMs: 3_600_000,
    spotifyUrl: 'https://open.spotify.com/episode/mock-ep-1',
    youtubeVideoId: 'dQw4w9WgXcQ',
    youtubeMatchStatus: 'confirmed',
  },
];

export const mockRetroList: RetroListItem[] = [
  { id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', releaseYear: '1995', episodeNumber: '15' },
];
