import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EpisodeDescription } from './EpisodeDescription';

describe('EpisodeDescription', () => {
  it('renders descriptionHtml as real markup when present', () => {
    render(
      <EpisodeDescription
        description="fallback plain text"
        descriptionHtml="<p>Overview - 4:40</p><p>Gameplay - 15:01</p>"
      />
    );
    expect(screen.getByText('Overview - 4:40')).toBeInTheDocument();
    expect(screen.getByText('Gameplay - 15:01')).toBeInTheDocument();
    // The two lines are separate elements (real paragraphs), not one run-on string.
    expect(screen.getByText('Overview - 4:40').tagName).toBe('P');
  });

  it('falls back to plain description when there is no descriptionHtml', () => {
    render(<EpisodeDescription description="Plain text only" />);
    expect(screen.getByText('Plain text only')).toBeInTheDocument();
  });

  it('renders nothing when there is neither', () => {
    const { container } = render(<EpisodeDescription description="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
