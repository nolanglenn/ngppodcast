export function YoutubeEmbed({ videoId }: { videoId: string }) {
  return (
    <iframe
      title="YouTube episode video"
      src={`https://www.youtube.com/embed/${videoId}`}
      width="100%"
      height="360"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  );
}
