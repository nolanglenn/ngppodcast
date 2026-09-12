'use client';

import { SearchableList } from '@/components/SearchableList';
import type { RetroListItem } from '@/lib/types';

export function RetroListClient({ items }: { items: RetroListItem[] }) {
  return (
    <SearchableList
      items={items}
      searchKeys={['game', 'platform', 'submittedBy']}
      placeholder="Search games..."
      getKey={(i) => i.id}
      renderItem={(i) => (
        <span>
          {i.game} — {i.platform} (submitted by {i.submittedBy})
        </span>
      )}
    />
  );
}
