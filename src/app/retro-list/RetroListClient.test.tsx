import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetroListClient } from './RetroListClient';
import type { RetroListItem } from '@/lib/types';

const items: RetroListItem[] = [
  { id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', releaseYear: '1995', episodeNumber: '15' },
  { id: 'row-1', game: 'Super Metroid', platform: 'SNES', releaseYear: '1994', episodeNumber: '' },
];

describe('RetroListClient', () => {
  it('lists all games with platform and release year', () => {
    render(<RetroListClient items={items} />);
    expect(screen.getByText(/Chrono Trigger/)).toBeInTheDocument();
    expect(screen.getByText(/Super Metroid/)).toBeInTheDocument();
    expect(screen.getByText('1995 · Episode #15')).toBeInTheDocument();
  });

  it('filters by search across game and platform', () => {
    render(<RetroListClient items={items} />);
    fireEvent.change(screen.getByPlaceholderText('Search games...'), { target: { value: 'Chrono' } });
    expect(screen.getByText(/Chrono Trigger/)).toBeInTheDocument();
    expect(screen.queryByText(/Super Metroid/)).not.toBeInTheDocument();
  });
});
