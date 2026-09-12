'use client';

import Link from 'next/link';
import { SearchableList } from '@/components/SearchableList';
import type { Episode } from '@/lib/types';

/**
 * The archive only lists and searches title + release date, so only these fields
 * need to be serialized into the client bundle — full descriptions across ~600
 * episodes would be shipped for nothing.
 */
export type ArchiveEpisode = Pick<Episode, 'id' | 'slug' | 'title' | 'releaseDate'>;

export function EpisodeArchiveClient({ episodes }: { episodes: ArchiveEpisode[] }) {
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
