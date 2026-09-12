import { getEpisodes, getRetroList } from '@/lib/data';
import { HomeContent } from './HomeContent';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // allSettled, not all: a Sheets outage must not take down the episode section
  // (and a Spotify outage must not take down Game of the Week).
  const [episodesResult, retroListResult] = await Promise.allSettled([getEpisodes(), getRetroList()]);

  if (episodesResult.status === 'rejected') {
    console.error('[page] home page episode section failed', episodesResult.reason);
  }
  if (retroListResult.status === 'rejected') {
    console.error('[page] home page retro list section failed', retroListResult.reason);
  }

  const episodes = episodesResult.status === 'fulfilled' ? episodesResult.value : [];
  const retroList = retroListResult.status === 'fulfilled' ? retroListResult.value : [];

  const latestEpisode = episodes[0] ?? null;
  const gameOfTheWeek = retroList[retroList.length - 1] ?? null;

  return (
    <main>
      <h1>New Game Plus Podcast</h1>
      <HomeContent latestEpisode={latestEpisode} gameOfTheWeek={gameOfTheWeek} />
    </main>
  );
}
