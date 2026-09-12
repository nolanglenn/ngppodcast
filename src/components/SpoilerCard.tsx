'use client';

import { useState, type ReactNode } from 'react';

interface SpoilerCardProps {
  label: string;
  children: ReactNode;
}

export function SpoilerCard({ label, children }: SpoilerCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      tabIndex={0}
      role="button"
      aria-label={`${label}: hover or focus to reveal`}
      style={{ filter: revealed ? 'none' : undefined, cursor: 'pointer' }}
    >
      {revealed ? children : label}
    </div>
  );
}
