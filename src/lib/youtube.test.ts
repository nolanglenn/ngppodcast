import { describe, it, expect, vi } from 'vitest';
import { fetchChannelUploads, matchEpisodeToUpload } from './youtube';

describe('fetchChannelUploads', () => {
  it('resolves the uploads playlist then paginates its items', async () => {
    process.env.YOUTUBE_API_KEY = 'key';
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return {
          ok: true,
          json: async () => ({
            items: [{ contentDetails: { relatedPlaylists: { uploads: 'UUplaylist' } } }],
          }),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          items: [
            {
              snippet: {
                title: 'Episode One Video',
                publishedAt: '2026-01-01T00:00:00Z',
                resourceId: { videoId: 'vid1' },
              },
            },
          ],
        }),
      } as unknown as Response;
    });

    const uploads = await fetchChannelUploads('channel1', fetchImpl);

    expect(uploads).toEqual([
      { videoId: 'vid1', title: 'Episode One Video', publishedAt: '2026-01-01T00:00:00Z' },
    ]);
  });
});

describe('matchEpisodeToUpload', () => {
  const uploads = [
    { videoId: 'vid1', title: 'Episode One: The Beginning', publishedAt: '2026-01-01T00:00:00Z' },
    { videoId: 'vid2', title: 'Totally Unrelated Video', publishedAt: '2026-01-01T00:00:00Z' },
  ];

  it('confirms a close title match within the date window', () => {
    const result = matchEpisodeToUpload(
      { title: 'Episode One - The Beginning', releaseDate: '2026-01-02' },
      uploads
    );
    expect(result.status).toBe('confirmed');
    expect(result.videoId).toBe('vid1');
  });

  it('returns none when no upload is within the date window', () => {
    const result = matchEpisodeToUpload(
      { title: 'Episode One - The Beginning', releaseDate: '2026-06-01' },
      uploads
    );
    expect(result.status).toBe('none');
    expect(result.videoId).toBeNull();
  });
});
