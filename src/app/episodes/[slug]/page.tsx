import { notFound } from 'next/navigation';
import { getEpisodeBySlug } from '@/lib/data';
import { SpotifyEmbed } from '@/components/SpotifyEmbed';
import { YoutubeEmbed } from '@/components/YoutubeEmbed';

export const dynamic = 'force-dynamic';

export default async function EpisodeDetailPage({ params }: { params: { slug: string } }) {
  const episode = await getEpisodeBySlug(params.slug);
  if (!episode) notFound();

  return (
    <main>
      <h1>{episode.title}</h1>
      <p>{episode.releaseDate}</p>
      <p>{episode.description}</p>
      <SpotifyEmbed episodeId={episode.id} />
      {episode.youtubeVideoId && <YoutubeEmbed videoId={episode.youtubeVideoId} />}
    </main>
  );
}
