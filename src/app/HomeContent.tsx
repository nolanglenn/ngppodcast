import { SpotifyEmbed } from '@/components/SpotifyEmbed';
import type { Episode } from '@/lib/types';

// Set up a Patreon page for the show, then replace this with the real URL.
const PATREON_URL = 'https://www.patreon.com/REPLACE_WITH_PATREON_HANDLE';

interface HomeContentProps {
  latestEpisode: Episode | null;
}

export function HomeContent({ latestEpisode }: HomeContentProps) {
  return (
    <>
      {latestEpisode && (
        <div className="ngp-section">
          <div className="ngp-card">
            <div className="ngp-episode-card">
              <div className="ngp-episode-thumb">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="var(--gold)">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              </div>
              <div className="ngp-episode-info">
                <span className="ngp-eyebrow-coral">Latest Episode</span>
                <h2 className="ngp-episode-title">{latestEpisode.title}</h2>
                <span className="ngp-episode-date">{latestEpisode.releaseDate}</span>
                {latestEpisode.description && <p className="ngp-episode-desc">{latestEpisode.description}</p>}
              </div>
            </div>
            <div className="ngp-embed-frame">
              <SpotifyEmbed episodeId={latestEpisode.id} />
            </div>
          </div>
        </div>
      )}

      <div className="ngp-section">
        <div className="ngp-cta">
          <div className="ngp-cta-left">
            <div className="ngp-cta-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--bg)">
                <path d="M12 21s-7.5-4.6-10-9.3C.6 8.4 2 4.8 5.3 4c2-.5 4 .3 5.2 2 .1.1.3.1.4 0C12.1 4.3 14.1 3.5 16.1 4c3.3.8 4.7 4.4 3.3 7.7C19.5 16.4 12 21 12 21z" />
              </svg>
            </div>
            <div>
              <div className="ngp-cta-title">Keep New Game Plus going</div>
              <div className="ngp-cta-sub">
                Ad-free episodes, early access, and monthly bonus content — support comes straight
                from listeners like you.
              </div>
            </div>
          </div>
          <a href={PATREON_URL} className="ngp-cta-button">
            Become a Patron
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}
