import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpoilerCard } from './SpoilerCard';

describe('SpoilerCard', () => {
  it('shows the label and hides content until hovered', () => {
    render(<SpoilerCard label="Reveal me">Chrono Trigger</SpoilerCard>);
    expect(screen.getByText('Reveal me')).toBeInTheDocument();
    expect(screen.queryByText('Chrono Trigger')).not.toBeInTheDocument();
  });

  it('reveals content on hover and hides it again on mouse leave', () => {
    render(<SpoilerCard label="Reveal me">Chrono Trigger</SpoilerCard>);
    const card = screen.getByRole('button');
    fireEvent.mouseEnter(card);
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument();
    fireEvent.mouseLeave(card);
    expect(screen.queryByText('Chrono Trigger')).not.toBeInTheDocument();
  });

  it('reveals content on focus and hides it again on blur', () => {
    render(<SpoilerCard label="Reveal me">Chrono Trigger</SpoilerCard>);
    const card = screen.getByRole('button');
    fireEvent.focus(card);
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument();
    fireEvent.blur(card);
    expect(screen.queryByText('Chrono Trigger')).not.toBeInTheDocument();
  });
});
