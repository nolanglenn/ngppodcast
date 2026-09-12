import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/data', () => ({ getEpisodes: vi.fn(), getRetroList: vi.fn() }));

import { getEpisodes, getRetroList } from '@/lib/data';
import HomePage from './page';
import type { Episode, RetroListItem } from '@/lib/types';

const episode: Episode = {
  id: 'ep1', slug: 'episode-one', title: 'Episode One', description: '', releaseDate: '2026-01-01',
  durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none',
};

const game: RetroListItem = {
  id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', submittedBy: 'Alice', notes: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HomePage', () => {
  it('renders both sections when both data sources succeed', async () => {
    vi.mocked(getEpisodes).mockResolvedValue([episode]);
    vi.mocked(getRetroList).mockResolvedValue([game]);

    render(await HomePage());

    expect(screen.getByText('Episode One')).toBeInTheDocument();
    expect(screen.getByText('Game of the Week')).toBeInTheDocument();
  });

  it('still renders the episode section when the Retro List fetch fails', async () => {
    vi.mocked(getEpisodes).mockResolvedValue([episode]);
    vi.mocked(getRetroList).mockRejectedValue(new Error('Sheets down'));

    render(await HomePage());

    expect(screen.getByText('Episode One')).toBeInTheDocument();
    expect(screen.queryByText('Game of the Week')).not.toBeInTheDocument();
  });

  it('still renders the Game of the Week when the episode fetch fails', async () => {
    vi.mocked(getEpisodes).mockRejectedValue(new Error('Spotify down'));
    vi.mocked(getRetroList).mockResolvedValue([game]);

    render(await HomePage());

    expect(screen.queryByText('Episode One')).not.toBeInTheDocument();
    expect(screen.getByText('Game of the Week')).toBeInTheDocument();
  });

  it('renders the page shell even when both data sources fail', async () => {
    vi.mocked(getEpisodes).mockRejectedValue(new Error('Spotify down'));
    vi.mocked(getRetroList).mockRejectedValue(new Error('Sheets down'));

    render(await HomePage());

    expect(screen.getByText('New Game Plus Podcast')).toBeInTheDocument();
  });
});
