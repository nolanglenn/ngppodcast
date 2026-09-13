import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/data', () => ({ getEpisodes: vi.fn() }));

import { getEpisodes } from '@/lib/data';
import HomePage from './page';
import type { Episode } from '@/lib/types';

const episode: Episode = {
  id: 'ep1', slug: 'episode-one', title: 'Episode One', description: '', releaseDate: '2026-01-01',
  durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HomePage', () => {
  it('renders the page shell and the latest episode', async () => {
    vi.mocked(getEpisodes).mockResolvedValue([episode]);

    render(await HomePage());

    expect(screen.getByText('New Game Plus Podcast')).toBeInTheDocument();
    expect(screen.getByText('Episode One')).toBeInTheDocument();
  });

  it('renders the page shell without an episode section when there are no episodes', async () => {
    vi.mocked(getEpisodes).mockResolvedValue([]);

    render(await HomePage());

    expect(screen.getByText('New Game Plus Podcast')).toBeInTheDocument();
    expect(screen.queryByTitle('Spotify episode player')).not.toBeInTheDocument();
  });

  it('propagates a getEpisodes failure (caught by the app error boundary)', async () => {
    vi.mocked(getEpisodes).mockRejectedValue(new Error('Spotify down'));

    await expect(HomePage()).rejects.toThrow('Spotify down');
  });
});
