import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeContent } from './HomeContent';
import type { Episode, RetroListItem } from '@/lib/types';

const episode: Episode = {
  id: 'ep1', slug: 'episode-one', title: 'Episode One', description: '', releaseDate: '2026-01-01',
  durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none',
};

const gameOfTheWeek: RetroListItem = {
  id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', submittedBy: 'Alice', notes: '',
};

describe('HomeContent', () => {
  it('shows the latest episode title and embed', () => {
    render(<HomeContent latestEpisode={episode} gameOfTheWeek={gameOfTheWeek} />);
    expect(screen.getByText('Episode One')).toBeInTheDocument();
    expect(screen.getByTitle('Spotify episode player')).toBeInTheDocument();
  });

  it('hides the Game of the Week pick until hovered', () => {
    render(<HomeContent latestEpisode={episode} gameOfTheWeek={gameOfTheWeek} />);
    expect(screen.queryByText(/Chrono Trigger/)).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('button'));
    expect(screen.getByText(/Chrono Trigger/)).toBeInTheDocument();
  });

  it('renders nothing for missing sections gracefully', () => {
    render(<HomeContent latestEpisode={null} gameOfTheWeek={null} />);
    expect(screen.queryByTitle('Spotify episode player')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
