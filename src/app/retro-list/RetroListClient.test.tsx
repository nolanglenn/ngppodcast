import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetroListClient } from './RetroListClient';
import type { RetroListItem } from '@/lib/types';

const items: RetroListItem[] = [
  { id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', submittedBy: 'Alice', notes: '' },
  { id: 'row-1', game: 'Super Metroid', platform: 'SNES', submittedBy: 'Bob', notes: '' },
];

describe('RetroListClient', () => {
  it('lists all games with platform and submitter', () => {
    render(<RetroListClient items={items} />);
    expect(screen.getByText(/Chrono Trigger/)).toBeInTheDocument();
    expect(screen.getByText(/Super Metroid/)).toBeInTheDocument();
  });

  it('filters by search across game, platform, and submitter', () => {
    render(<RetroListClient items={items} />);
    fireEvent.change(screen.getByPlaceholderText('Search games...'), { target: { value: 'Chrono' } });
    expect(screen.getByText(/Chrono Trigger/)).toBeInTheDocument();
    expect(screen.queryByText(/Super Metroid/)).not.toBeInTheDocument();
  });
});
