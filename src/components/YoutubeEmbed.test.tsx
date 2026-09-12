import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YoutubeEmbed } from './YoutubeEmbed';

describe('YoutubeEmbed', () => {
  it('renders an iframe pointed at the YouTube embed URL for the video', () => {
    render(<YoutubeEmbed videoId="vid1" />);
    const iframe = screen.getByTitle('YouTube episode video');
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/vid1');
  });
});
