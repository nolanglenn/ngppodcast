import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/data', () => ({ getEpisodeBySlug: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

import { getEpisodeBySlug } from '@/lib/data';
import EpisodeDetailPage from './page';
import type { Episode } from '@/lib/types';

function episode(overrides: Partial<Episode>): Episode {
  return {
    id: 'ep1',
    slug: 'ep-1',
    title: 'Ep 1',
    description: 'Description',
    releaseDate: '2026-01-01',
    durationMs: 1,
    spotifyUrl: 'x',
    youtubeVideoId: null,
    youtubeMatchStatus: 'none',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EpisodeDetailPage', () => {
  it('renders the YouTube embed for a confirmed match', async () => {
    vi.mocked(getEpisodeBySlug).mockResolvedValue(
      episode({ youtubeVideoId: 'vid1', youtubeMatchStatus: 'confirmed' })
    );

    render(await EpisodeDetailPage({ params: { slug: 'ep-1' } }));

    expect(screen.getByTitle('YouTube episode video')).toBeInTheDocument();
  });

  it('does NOT render the YouTube embed for a low-confidence match', async () => {
    vi.mocked(getEpisodeBySlug).mockResolvedValue(
      episode({ youtubeVideoId: 'vid1', youtubeMatchStatus: 'low_confidence' })
    );

    render(await EpisodeDetailPage({ params: { slug: 'ep-1' } }));

    expect(screen.queryByTitle('YouTube episode video')).not.toBeInTheDocument();
    // The Spotify embed still renders — only the unconfirmed match is withheld.
    expect(screen.getByTitle('Spotify episode player')).toBeInTheDocument();
  });

  it('does not render the YouTube embed when there is no match', async () => {
    vi.mocked(getEpisodeBySlug).mockResolvedValue(episode({}));

    render(await EpisodeDetailPage({ params: { slug: 'ep-1' } }));

    expect(screen.queryByTitle('YouTube episode video')).not.toBeInTheDocument();
  });

  it('calls notFound for an unknown slug', async () => {
    vi.mocked(getEpisodeBySlug).mockResolvedValue(null);

    await expect(EpisodeDetailPage({ params: { slug: 'nope' } })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
