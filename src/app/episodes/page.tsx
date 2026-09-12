import { getEpisodes } from '@/lib/data';
import { EpisodeArchiveClient } from './EpisodeArchiveClient';

export const dynamic = 'force-dynamic'; // fetch at request time, not build time

export default async function EpisodesPage() {
  const episodes = await getEpisodes();
  return (
    <main>
      <h1>Episodes</h1>
      <EpisodeArchiveClient episodes={episodes} />
    </main>
  );
}
