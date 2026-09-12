import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpotifyEmbed } from './SpotifyEmbed';

describe('SpotifyEmbed', () => {
  it('renders an iframe pointed at the Spotify embed URL for the episode', () => {
    render(<SpotifyEmbed episodeId="ep1" />);
    const iframe = screen.getByTitle('Spotify episode player');
    expect(iframe).toHaveAttribute('src', 'https://open.spotify.com/embed/episode/ep1');
  });
});
