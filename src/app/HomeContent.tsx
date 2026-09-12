import { SpotifyEmbed } from '@/components/SpotifyEmbed';
import { SpoilerCard } from '@/components/SpoilerCard';
import type { Episode, RetroListItem } from '@/lib/types';

interface HomeContentProps {
  latestEpisode: Episode | null;
  gameOfTheWeek: RetroListItem | null;
}

export function HomeContent({ latestEpisode, gameOfTheWeek }: HomeContentProps) {
  return (
    <>
      {latestEpisode && (
        <section>
          <h2>{latestEpisode.title}</h2>
          <SpotifyEmbed episodeId={latestEpisode.id} />
        </section>
      )}
      {gameOfTheWeek && (
        <section>
          <h3>Game of the Week</h3>
          <SpoilerCard label="This week's pick — hover to reveal">
            {gameOfTheWeek.game} ({gameOfTheWeek.platform})
          </SpoilerCard>
        </section>
      )}
    </>
  );
}
