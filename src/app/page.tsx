import { getEpisodes } from '@/lib/data';
import { HomeContent } from './HomeContent';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const episodes = await getEpisodes();
  const latestEpisode = episodes[0] ?? null;

  return (
    <main>
      <div className="ngp-hero">
        <p className="ngp-eyebrow">Weekly Retro Gaming Podcast</p>
        <h1>New Game Plus Podcast</h1>
        <p>
          New games come and go. We come back for the old ones — a weekly deep-dive into the games
          worth replaying.
        </p>
      </div>
      <HomeContent latestEpisode={latestEpisode} />
    </main>
  );
}
