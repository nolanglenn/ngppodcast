'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Fuse from 'fuse.js';

interface SearchableListProps<T> {
  items: T[];
  searchKeys: string[];
  placeholder: string;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}

export function SearchableList<T>({
  items,
  searchKeys,
  placeholder,
  getKey,
  renderItem,
}: SearchableListProps<T>) {
  const [query, setQuery] = useState('');
  const fuse = useMemo(() => new Fuse(items, { keys: searchKeys, threshold: 0.35 }), [items, searchKeys]);
  const results = useMemo(
    () => (query.trim() ? fuse.search(query).map((r) => r.item) : items),
    [query, fuse, items]
  );

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <ul>
        {results.map((item) => (
          <li key={getKey(item)}>{renderItem(item)}</li>
        ))}
      </ul>
    </div>
  );
}
