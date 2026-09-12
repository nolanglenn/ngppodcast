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
        <Link href={`/episodes/${e.slug}`} className="ngp-list-row">
          <span>
            <span className="ngp-list-title">{e.title}</span>
            <span className="ngp-list-date">{e.releaseDate}</span>
          </span>
          <svg
            className="ngp-list-chevron"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      )}
    />
  );
}
