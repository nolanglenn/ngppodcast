import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nav } from './Nav';

describe('Nav', () => {
  it('links to every top-level page', () => {
    render(<Nav />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Episodes' })).toHaveAttribute('href', '/episodes');
    expect(screen.getByRole('link', { name: 'Retro Master List' })).toHaveAttribute('href', '/retro-list');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });
});
