import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EpisodeArchiveClient } from './EpisodeArchiveClient';
import type { Episode } from '@/lib/types';

const episodes: Episode[] = [
  {
    id: 'ep1', slug: 'episode-one', title: 'Episode One', description: '', releaseDate: '2026-01-01',
    durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none',
  },
  {
    id: 'ep2', slug: 'episode-two', title: 'Episode Two', description: '', releaseDate: '2026-01-08',
    durationMs: 1, spotifyUrl: 'y', youtubeVideoId: null, youtubeMatchStatus: 'none',
  },
];

describe('EpisodeArchiveClient', () => {
  it('lists episode titles as links to their detail page', () => {
    render(<EpisodeArchiveClient episodes={episodes} />);
    const link = screen.getByText(/Episode One/) as HTMLElement;
    expect(link.closest('a')).toHaveAttribute('href', '/episodes/episode-one');
  });

  it('filters by search', () => {
    render(<EpisodeArchiveClient episodes={episodes} />);
    fireEvent.change(screen.getByPlaceholderText('Search episodes...'), { target: { value: 'One' } });
    expect(screen.getByText(/Episode One/)).toBeInTheDocument();
    expect(screen.queryByText(/Episode Two/)).not.toBeInTheDocument();
  });
});
