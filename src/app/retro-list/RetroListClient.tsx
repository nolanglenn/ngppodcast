'use client';

import { SearchableList } from '@/components/SearchableList';
import type { RetroListItem } from '@/lib/types';

export function RetroListClient({ items }: { items: RetroListItem[] }) {
  return (
    <SearchableList
      items={items}
      searchKeys={['game', 'platform']}
      placeholder="Search games..."
      getKey={(i) => i.id}
      layout="grid"
      renderItem={(i) => (
        <div className="ngp-grid-item">
          <div className="ngp-grid-item-top">
            <span className="ngp-grid-item-title">{i.game}</span>
            <span className="ngp-badge">{i.platform}</span>
          </div>
          <span className="ngp-grid-item-sub">
            {[i.releaseYear, i.episodeNumber && `Episode #${i.episodeNumber}`].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}
    />
  );
}
