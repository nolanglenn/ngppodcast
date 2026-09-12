import { getEpisodes, getRetroList } from '@/lib/data';
import { HomeContent } from './HomeContent';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [episodes, retroList] = await Promise.all([getEpisodes(), getRetroList()]);
  const latestEpisode = episodes[0] ?? null;
  const gameOfTheWeek = retroList[retroList.length - 1] ?? null;

  return (
    <main>
      <h1>New Game Plus Podcast</h1>
      <HomeContent latestEpisode={latestEpisode} gameOfTheWeek={gameOfTheWeek} />
    </main>
  );
}
