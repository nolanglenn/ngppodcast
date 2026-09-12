'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Fuse from 'fuse.js';

interface SearchableListProps<T> {
  items: T[];
  searchKeys: string[];
  placeholder: string;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** 'list' (default) stacks rows in a bordered card; 'grid' lays items out as cards in a responsive grid. */
  layout?: 'list' | 'grid';
}

export function SearchableList<T>({
  items,
  searchKeys,
  placeholder,
  getKey,
  renderItem,
  layout = 'list',
}: SearchableListProps<T>) {
  const [query, setQuery] = useState('');
  const fuse = useMemo(() => new Fuse(items, { keys: searchKeys, threshold: 0.35 }), [items, searchKeys]);
  const results = useMemo(
    () => (query.trim() ? fuse.search(query).map((r) => r.item) : items),
    [query, fuse, items]
  );

  return (
    <div className="ngp-search-wrap">
      <div className="ngp-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
      </div>
      <ul className={layout === 'grid' ? 'ngp-grid' : 'ngp-list'}>
        {results.map((item) => (
          <li key={getKey(item)}>{renderItem(item)}</li>
        ))}
      </ul>
    </div>
  );
}
