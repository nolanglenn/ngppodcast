export function SpotifyEmbed({ episodeId }: { episodeId: string }) {
  return (
    <iframe
      title="Spotify episode player"
      src={`https://open.spotify.com/embed/episode/${episodeId}`}
      width="100%"
      height="232"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}
