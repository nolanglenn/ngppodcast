interface EpisodeDescriptionProps {
  description: string;
  descriptionHtml?: string;
  className?: string;
}

/**
 * Renders `descriptionHtml` (Spotify's structured show notes) when present,
 * falling back to the plain-text `description` otherwise (mock/test fixtures,
 * or an episode fetched before this field existed).
 *
 * `descriptionHtml` comes straight from Spotify's own API for this show's own
 * episodes — not arbitrary third-party or user-submitted HTML — so rendering
 * it directly is the same trust boundary as `description` already crossed.
 */
export function EpisodeDescription({ description, descriptionHtml, className }: EpisodeDescriptionProps) {
  if (descriptionHtml) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: descriptionHtml }} />;
  }
  if (!description) return null;
  return <p className={className}>{description}</p>;
}
