import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeContent } from './HomeContent';
import type { Episode } from '@/lib/types';

const episode: Episode = {
  id: 'ep1', slug: 'episode-one', title: 'Episode One', description: '', releaseDate: '2026-01-01',
  durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none',
};

describe('HomeContent', () => {
  it('shows the latest episode title and embed', () => {
    render(<HomeContent latestEpisode={episode} />);
    expect(screen.getByText('Episode One')).toBeInTheDocument();
    expect(screen.getByTitle('Spotify episode player')).toBeInTheDocument();
  });

  it('always shows the Patreon support link', () => {
    render(<HomeContent latestEpisode={episode} />);
    expect(screen.getByRole('link', { name: /Become a Patron/ })).toBeInTheDocument();
  });

  it('renders nothing for the episode section when there is no latest episode', () => {
    render(<HomeContent latestEpisode={null} />);
    expect(screen.queryByTitle('Spotify episode player')).not.toBeInTheDocument();
    // The Patreon CTA doesn't depend on episode data, so it still renders.
    expect(screen.getByRole('link', { name: /Become a Patron/ })).toBeInTheDocument();
  });
});
