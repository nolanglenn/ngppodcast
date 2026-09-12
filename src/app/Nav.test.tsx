import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/episodes' }));

import { Nav } from './Nav';

describe('Nav', () => {
  it('links to every top-level page', () => {
    render(<Nav />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Episodes' })).toHaveAttribute('href', '/episodes');
    expect(screen.getByRole('link', { name: 'Retro Master List' })).toHaveAttribute('href', '/retro-list');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });

  it('marks the link matching the current path as the current page', () => {
    render(<Nav />);
    expect(screen.getByRole('link', { name: 'Episodes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Retro Master List' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'About' })).not.toHaveAttribute('aria-current');
  });
});
