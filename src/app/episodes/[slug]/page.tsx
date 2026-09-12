import Link from 'next/link';
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
      <div className="ngp-detail-wrap">
        <div className="ngp-detail">
          <Link href="/episodes" className="ngp-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to Episodes
          </Link>

          <div>
            <h1 className="ngp-detail-title">{episode.title}</h1>
            <div className="ngp-detail-meta">{episode.releaseDate}</div>
            <p className="ngp-detail-desc">{episode.description}</p>
          </div>

          <div>
            <div className="ngp-embed-frame">
              <SpotifyEmbed episodeId={episode.id} />
            </div>
            <div className="ngp-embed-caption">Spotify episode player</div>
          </div>

          {/* Only confirmed matches are shown publicly — a low-confidence match keeps
              its videoId in the data layer for admin review, but must never render here. */}
          {episode.youtubeMatchStatus === 'confirmed' && episode.youtubeVideoId && (
            <div>
              <div className="ngp-embed-frame">
                <YoutubeEmbed videoId={episode.youtubeVideoId} />
              </div>
              <div className="ngp-embed-caption">YouTube video</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
