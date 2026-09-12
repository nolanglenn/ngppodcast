import { getEpisodes } from '@/lib/data';
import { EpisodeArchiveClient, type ArchiveEpisode } from './EpisodeArchiveClient';

export const dynamic = 'force-dynamic'; // fetch at request time, not build time

export default async function EpisodesPage() {
  const episodes = await getEpisodes();
  // Trim to only what the archive renders/searches — descriptions would otherwise
  // be serialized into the client payload for every episode.
  const archiveEpisodes: ArchiveEpisode[] = episodes.map(({ id, slug, title, releaseDate }) => ({
    id,
    slug,
    title,
    releaseDate,
  }));

  return (
    <main>
      <h1>Episodes</h1>
      <EpisodeArchiveClient episodes={archiveEpisodes} />
    </main>
  );
}
