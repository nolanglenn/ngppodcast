'use client';

import Link from 'next/link';
import { SearchableList } from '@/components/SearchableList';
import type { Episode } from '@/lib/types';

export function EpisodeArchiveClient({ episodes }: { episodes: Episode[] }) {
  return (
    <SearchableList
      items={episodes}
      searchKeys={['title']}
      placeholder="Search episodes..."
      getKey={(e) => e.id}
      renderItem={(e) => (
        <Link href={`/episodes/${e.slug}`}>
          {e.title} — {e.releaseDate}
        </Link>
      )}
    />
  );
}
