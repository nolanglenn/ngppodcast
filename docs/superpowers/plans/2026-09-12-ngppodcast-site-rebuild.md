# NGP Podcast Site Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ground-up rebuild of ngppodcast.com: a searchable ~600-episode archive (Spotify + YouTube embeds), a viewable/searchable Retro Master List, and a home page — on a free-tier, low-maintenance stack.

**Architecture:** Next.js (App Router, TypeScript) on Vercel free tier. Server Components fetch/cache data from Spotify Web API, YouTube Data API, and Google Sheets API through a shared data layer backed by Vercel KV (cache only, not source of truth). Client-side Fuse.js handles search over the small (~600-row) datasets already sent to the browser. No dedicated database.

**Tech Stack:** Next.js 14 (App Router) + TypeScript, Vercel KV (`@vercel/kv`), Fuse.js, Vitest + @testing-library/react (unit/integration), Playwright (e2e), Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-09-12-ngppodcast-site-rebuild-design.md`

## Global Constraints

- Hosting/services must stay free-tier / near-zero cost (Vercel free tier, Vercel KV free tier, Spotify/YouTube/Sheets API free quotas).
- No dedicated database — Vercel KV is a cache only; Spotify and the Google Sheet remain the sources of truth.
- Retro Master List is read-only in v1 — no submission form.
- Episode data refresh: ~2-5 min cache. Retro Master List refresh: near-instant via on-demand revalidation, with a 15-min periodic fallback.
- A low-confidence or missing YouTube match must never be shown to the public as if confirmed — omit the embed instead.
- Cutting the live ngppodcast.com domain over to this new site is **explicitly out of scope for this plan** and requires separate, explicit user approval — no task here touches DNS or the live domain.

---

### Task 1: Project scaffold, tooling, and shared env helper

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `.eslintrc.json`, `.gitignore`
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Create: `src/lib/env.ts`
- Test: `src/lib/env.test.ts`
- Create: `.env.local.example`

**Interfaces:**
- Produces: `getRequiredEnv(name: string): string` — throws `Error('Missing required environment variable: ' + name)` if unset, used by every later API client.

- [ ] **Step 1: Scaffold the Next.js app**

Run:
```bash
npx create-next-app@14 . --typescript --eslint --app --src-dir --import-alias "@/*" --no-tailwind
```
Accept defaults for anything not covered by flags. This creates `src/app`, `tsconfig.json`, `next.config.mjs`, `.eslintrc.json`, `package.json`.

- [ ] **Step 2: Add test tooling dependencies**

Run:
```bash
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
npm install @vercel/kv fuse.js
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` `scripts`:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 4: Write the failing test for the env helper**

Create `src/lib/env.test.ts`:
```ts
import { describe, it, expect, afterEach } from 'vitest';
import { getRequiredEnv } from './env';

describe('getRequiredEnv', () => {
  afterEach(() => {
    delete process.env.TEST_VAR;
  });

  it('returns the value when set', () => {
    process.env.TEST_VAR = 'hello';
    expect(getRequiredEnv('TEST_VAR')).toBe('hello');
  });

  it('throws a clear error when missing', () => {
    expect(() => getRequiredEnv('TEST_VAR')).toThrow(
      'Missing required environment variable: TEST_VAR'
    );
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- src/lib/env.test.ts`
Expected: FAIL — `Cannot find module './env'` (file doesn't exist yet).

- [ ] **Step 6: Implement the env helper**

Create `src/lib/env.ts`:
```ts
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- src/lib/env.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 8: Add the env var template**

Create `.env.local.example`:
```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_SHOW_ID=
YOUTUBE_API_KEY=
YOUTUBE_CHANNEL_ID=
GOOGLE_SHEETS_API_KEY=
RETRO_LIST_SHEET_ID=
RETRO_LIST_RANGE=Sheet1!A:D
REVALIDATE_SECRET=
CRON_SECRET=
KV_REST_API_URL=
KV_REST_API_TOKEN=
MOCK_DATA=
```

Confirm `.gitignore` (from scaffold) already ignores `.env*.local` and `node_modules`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with test tooling and env helper"
```

---

### Task 2: Domain types and pure utilities (slug, title similarity)

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/slug.ts`
- Test: `src/lib/slug.test.ts`
- Create: `src/lib/similarity.ts`
- Test: `src/lib/similarity.test.ts`

**Interfaces:**
- Produces: `Episode`, `RetroListItem`, `YoutubeUpload`, `YoutubeMatchResult` types; `slugify(title: string): string`; `titleSimilarity(a: string, b: string): number` (0-1).

- [ ] **Step 1: Define shared types**

Create `src/lib/types.ts`:
```ts
export interface Episode {
  id: string;
  slug: string;
  title: string;
  description: string;
  releaseDate: string; // ISO 8601 date, e.g. "2026-01-01"
  durationMs: number;
  spotifyUrl: string;
  youtubeVideoId: string | null;
  youtubeMatchStatus: 'confirmed' | 'low_confidence' | 'none';
}

export interface RetroListItem {
  id: string;
  game: string;
  platform: string;
  submittedBy: string;
  notes: string;
}

export interface YoutubeUpload {
  videoId: string;
  title: string;
  publishedAt: string; // ISO 8601 datetime
}

export interface YoutubeMatchResult {
  videoId: string | null;
  status: 'confirmed' | 'low_confidence' | 'none';
  score: number;
}
```

- [ ] **Step 2: Write the failing test for slugify**

Create `src/lib/slug.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Episode 42: The Return')).toBe('episode-42-the-return');
  });

  it('strips leading/trailing hyphens from punctuation', () => {
    expect(slugify('!!Hello World!!')).toBe('hello-world');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/lib/slug.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement slugify**

Create `src/lib/slug.ts`:
```ts
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/slug.test.ts`
Expected: PASS

- [ ] **Step 6: Write the failing test for titleSimilarity**

Create `src/lib/similarity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { titleSimilarity } from './similarity';

describe('titleSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(titleSimilarity('Episode 42', 'Episode 42')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(titleSimilarity('abc', 'xyz')).toBe(0);
  });

  it('returns a high score for a near-duplicate with punctuation differences', () => {
    const score = titleSimilarity(
      'Episode 42: The Return of Chrono Trigger',
      'Episode 42 - The Return of Chrono Trigger'
    );
    expect(score).toBeGreaterThan(0.8);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- src/lib/similarity.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement titleSimilarity (bigram Dice coefficient)**

Create `src/lib/similarity.ts`:
```ts
function bigrams(input: string): string[] {
  const clean = input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const pairs: string[] = [];
  for (let i = 0; i < clean.length - 1; i++) {
    pairs.push(clean.slice(i, i + 2));
  }
  return pairs;
}

export function titleSimilarity(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.length === 0 || bigramsB.length === 0) return 0;

  const remaining = new Map<string, number>();
  for (const bg of bigramsB) {
    remaining.set(bg, (remaining.get(bg) ?? 0) + 1);
  }

  let matches = 0;
  for (const bg of bigramsA) {
    const count = remaining.get(bg) ?? 0;
    if (count > 0) {
      matches += 1;
      remaining.set(bg, count - 1);
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length);
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- src/lib/similarity.test.ts`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add domain types, slugify, and title similarity utils"
```

---

### Task 3: Spotify client

**Files:**
- Create: `src/lib/spotify.ts`
- Test: `src/lib/spotify.test.ts`

**Interfaces:**
- Consumes: `getRequiredEnv` (Task 1), `slugify` (Task 2), `Episode` type minus YouTube fields (Task 2).
- Produces: `fetchAllSpotifyEpisodes(showId: string, fetchImpl?: typeof fetch): Promise<Omit<Episode, 'youtubeVideoId' | 'youtubeMatchStatus'>[]>` — used by Task 7's data layer.

- [ ] **Step 1: Write the failing test**

Create `src/lib/spotify.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { fetchAllSpotifyEpisodes } from './spotify';

function mockFetchSequence(responses: Array<{ ok: boolean; status?: number; json: () => unknown }>) {
  let call = 0;
  return vi.fn(async () => {
    const response = responses[call];
    call += 1;
    return response as unknown as Response;
  });
}

describe('fetchAllSpotifyEpisodes', () => {
  it('fetches a token then paginates through all episode pages', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'id';
    process.env.SPOTIFY_CLIENT_SECRET = 'secret';

    const fetchImpl = mockFetchSequence([
      { ok: true, json: () => ({ access_token: 'token123', expires_in: 3600, token_type: 'Bearer' }) },
      {
        ok: true,
        json: () => ({
          items: [
            {
              id: 'ep1',
              name: 'Episode One',
              description: 'First episode',
              release_date: '2026-01-01',
              duration_ms: 1000,
              external_urls: { spotify: 'https://open.spotify.com/episode/ep1' },
            },
          ],
          next: 'https://api.spotify.com/v1/shows/show1/episodes?offset=50',
        }),
      },
      {
        ok: true,
        json: () => ({
          items: [
            {
              id: 'ep2',
              name: 'Episode Two',
              description: 'Second episode',
              release_date: '2026-01-08',
              duration_ms: 2000,
              external_urls: { spotify: 'https://open.spotify.com/episode/ep2' },
            },
          ],
          next: null,
        }),
      },
    ]);

    const episodes = await fetchAllSpotifyEpisodes('show1', fetchImpl);

    expect(episodes).toHaveLength(2);
    expect(episodes[0]).toEqual({
      id: 'ep1',
      slug: 'episode-one',
      title: 'Episode One',
      description: 'First episode',
      releaseDate: '2026-01-01',
      durationMs: 1000,
      spotifyUrl: 'https://open.spotify.com/episode/ep1',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3); // token + 2 pages
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/spotify.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the Spotify client**

Create `src/lib/spotify.ts`:
```ts
import { getRequiredEnv } from './env';
import { slugify } from './slug';
import type { Episode } from './types';

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface SpotifyEpisodeItem {
  id: string;
  name: string;
  description: string;
  release_date: string;
  duration_ms: number;
  external_urls: { spotify: string };
}

interface SpotifyEpisodesPage {
  items: SpotifyEpisodeItem[];
  next: string | null;
}

type BaseEpisode = Omit<Episode, 'youtubeVideoId' | 'youtubeMatchStatus'>;

async function getSpotifyAccessToken(fetchImpl: typeof fetch): Promise<string> {
  const clientId = getRequiredEnv('SPOTIFY_CLIENT_ID');
  const clientSecret = getRequiredEnv('SPOTIFY_CLIENT_SECRET');
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetchImpl('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
  const data = (await res.json()) as SpotifyTokenResponse;
  return data.access_token;
}

function mapSpotifyEpisode(item: SpotifyEpisodeItem): BaseEpisode {
  return {
    id: item.id,
    slug: slugify(item.name),
    title: item.name,
    description: item.description,
    releaseDate: item.release_date,
    durationMs: item.duration_ms,
    spotifyUrl: item.external_urls.spotify,
  };
}

export async function fetchAllSpotifyEpisodes(
  showId: string,
  fetchImpl: typeof fetch = fetch
): Promise<BaseEpisode[]> {
  const token = await getSpotifyAccessToken(fetchImpl);
  const items: SpotifyEpisodeItem[] = [];
  let url: string | null = `https://api.spotify.com/v1/shows/${showId}/episodes?limit=50`;

  while (url) {
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Spotify episodes request failed: ${res.status}`);
    const page = (await res.json()) as SpotifyEpisodesPage;
    items.push(...page.items);
    url = page.next;
  }

  return items.map(mapSpotifyEpisode);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/spotify.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Spotify client for fetching show episodes"
```

---

### Task 4: YouTube client (channel uploads + title/date matching)

**Files:**
- Create: `src/lib/youtube.ts`
- Test: `src/lib/youtube.test.ts`

**Interfaces:**
- Consumes: `getRequiredEnv` (Task 1), `titleSimilarity` (Task 2), `YoutubeUpload`/`YoutubeMatchResult` types (Task 2).
- Produces: `fetchChannelUploads(channelId: string, fetchImpl?: typeof fetch): Promise<YoutubeUpload[]>`; `matchEpisodeToUpload(episode: { title: string; releaseDate: string }, uploads: YoutubeUpload[]): YoutubeMatchResult` — both used by Task 7's data layer.

- [ ] **Step 1: Write the failing test for fetchChannelUploads**

Create `src/lib/youtube.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/youtube.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the YouTube client**

Create `src/lib/youtube.ts`:
```ts
import { getRequiredEnv } from './env';
import { titleSimilarity } from './similarity';
import type { YoutubeUpload, YoutubeMatchResult } from './types';

interface YoutubeChannelResponse {
  items: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
}

interface YoutubePlaylistItemsResponse {
  items: {
    snippet: { title: string; publishedAt: string; resourceId: { videoId: string } };
  }[];
  nextPageToken?: string;
}

export async function fetchChannelUploads(
  channelId: string,
  fetchImpl: typeof fetch = fetch
): Promise<YoutubeUpload[]> {
  const apiKey = getRequiredEnv('YOUTUBE_API_KEY');

  const channelRes = await fetchImpl(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
  );
  if (!channelRes.ok) throw new Error(`YouTube channel request failed: ${channelRes.status}`);
  const channelData = (await channelRes.json()) as YoutubeChannelResponse;
  const uploadsPlaylistId = channelData.items[0]?.contentDetails.relatedPlaylists.uploads;
  if (!uploadsPlaylistId) throw new Error('No uploads playlist found for channel');

  const uploads: YoutubeUpload[] = [];
  let pageToken = '';
  do {
    const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
    const res = await fetchImpl(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}${pageParam}`
    );
    if (!res.ok) throw new Error(`YouTube playlist items request failed: ${res.status}`);
    const data = (await res.json()) as YoutubePlaylistItemsResponse;
    for (const item of data.items) {
      uploads.push({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
      });
    }
    pageToken = data.nextPageToken ?? '';
  } while (pageToken);

  return uploads;
}

const CONFIRMED_THRESHOLD = 0.6;
const LOW_CONFIDENCE_THRESHOLD = 0.35;
const MAX_DATE_DIFF_DAYS = 10;
const DAY_MS = 86_400_000;

export function matchEpisodeToUpload(
  episode: { title: string; releaseDate: string },
  uploads: YoutubeUpload[]
): YoutubeMatchResult {
  const episodeDateMs = new Date(episode.releaseDate).getTime();
  let best: { upload: YoutubeUpload; score: number } | null = null;

  for (const upload of uploads) {
    const dateDiffDays = Math.abs(new Date(upload.publishedAt).getTime() - episodeDateMs) / DAY_MS;
    if (dateDiffDays > MAX_DATE_DIFF_DAYS) continue;

    const score = titleSimilarity(episode.title, upload.title);
    if (!best || score > best.score) best = { upload, score };
  }

  if (!best) return { videoId: null, status: 'none', score: 0 };
  if (best.score >= CONFIRMED_THRESHOLD) {
    return { videoId: best.upload.videoId, status: 'confirmed', score: best.score };
  }
  if (best.score >= LOW_CONFIDENCE_THRESHOLD) {
    return { videoId: best.upload.videoId, status: 'low_confidence', score: best.score };
  }
  return { videoId: null, status: 'none', score: best.score };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/youtube.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add YouTube client with channel uploads and episode matching"
```

---

### Task 5: Google Sheets client (Retro Master List)

**Files:**
- Create: `src/lib/sheets.ts`
- Test: `src/lib/sheets.test.ts`

**Interfaces:**
- Consumes: `getRequiredEnv` (Task 1), `RetroListItem` type (Task 2).
- Produces: `fetchRetroListRows(fetchImpl?: typeof fetch): Promise<string[][]>`; `mapSheetRowsToRetroList(rows: string[][]): RetroListItem[]` — used by Task 7's data layer.

**Note:** the Sheet must be shared as "Anyone with the link — Viewer" so the Sheets API v4 read works with a plain API key (no service account needed). Header names assumed below (`game`, `platform`, `submitted_by`, `notes`) — confirm these against the real Sheet during setup and adjust `EXPECTED_HEADERS` lookups if the actual header text differs.

- [ ] **Step 1: Write the failing test for mapSheetRowsToRetroList**

Create `src/lib/sheets.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { mapSheetRowsToRetroList, fetchRetroListRows } from './sheets';

describe('mapSheetRowsToRetroList', () => {
  it('maps header + data rows into RetroListItem objects', () => {
    const rows = [
      ['game', 'platform', 'submitted_by', 'notes'],
      ['Chrono Trigger', 'SNES', 'Alice', 'Great pick'],
      ['Metroid', 'NES', 'Bob', ''],
    ];

    expect(mapSheetRowsToRetroList(rows)).toEqual([
      { id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', submittedBy: 'Alice', notes: 'Great pick' },
      { id: 'row-1', game: 'Metroid', platform: 'NES', submittedBy: 'Bob', notes: '' },
    ]);
  });

  it('skips rows missing a game name', () => {
    const rows = [
      ['game', 'platform', 'submitted_by', 'notes'],
      ['', 'SNES', 'Alice', ''],
      ['Metroid', 'NES', 'Bob', ''],
    ];

    const result = mapSheetRowsToRetroList(rows);
    expect(result).toHaveLength(1);
    expect(result[0].game).toBe('Metroid');
  });

  it('returns an empty array for an empty sheet', () => {
    expect(mapSheetRowsToRetroList([])).toEqual([]);
  });
});

describe('fetchRetroListRows', () => {
  it('calls the Sheets API with the configured sheet id, range, and key', async () => {
    process.env.RETRO_LIST_SHEET_ID = 'sheet123';
    process.env.GOOGLE_SHEETS_API_KEY = 'key123';
    process.env.RETRO_LIST_RANGE = 'Sheet1!A:D';

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ values: [['game', 'platform', 'submitted_by', 'notes']] }),
    })) as unknown as typeof fetch;

    const rows = await fetchRetroListRows(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('spreadsheets/sheet123/values/Sheet1!A%3AD?key=key123')
    );
    expect(rows).toEqual([['game', 'platform', 'submitted_by', 'notes']]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/sheets.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the Sheets client**

Create `src/lib/sheets.ts`:
```ts
import { getRequiredEnv } from './env';
import type { RetroListItem } from './types';

interface SheetsValuesResponse {
  values?: string[][];
}

export function mapSheetRowsToRetroList(rows: string[][]): RetroListItem[] {
  if (rows.length === 0) return [];
  const [header, ...dataRows] = rows;
  const colIndex = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);

  const gameIdx = colIndex('game');
  const platformIdx = colIndex('platform');
  const submittedByIdx = colIndex('submitted_by');
  const notesIdx = colIndex('notes');

  const items: RetroListItem[] = [];
  dataRows.forEach((row, i) => {
    const game = gameIdx >= 0 ? row[gameIdx]?.trim() : undefined;
    if (!game) return; // skip malformed/empty row rather than crash the page
    items.push({
      id: `row-${i}`,
      game,
      platform: (platformIdx >= 0 ? row[platformIdx] : '') ?? '',
      submittedBy: (submittedByIdx >= 0 ? row[submittedByIdx] : '') ?? '',
      notes: (notesIdx >= 0 ? row[notesIdx] : '') ?? '',
    });
  });
  return items;
}

export async function fetchRetroListRows(fetchImpl: typeof fetch = fetch): Promise<string[][]> {
  const sheetId = getRequiredEnv('RETRO_LIST_SHEET_ID');
  const apiKey = getRequiredEnv('GOOGLE_SHEETS_API_KEY');
  const range = process.env.RETRO_LIST_RANGE ?? 'Sheet1!A:D';

  const res = await fetchImpl(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`
  );
  if (!res.ok) throw new Error(`Sheets request failed: ${res.status}`);
  const data = (await res.json()) as SheetsValuesResponse;
  return data.values ?? [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/sheets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Google Sheets client for Retro Master List rows"
```

---

### Task 6: Vercel KV cache layer

**Files:**
- Create: `src/lib/cache.ts`
- Test: `src/lib/cache.test.ts`

**Interfaces:**
- Consumes: `Episode`, `RetroListItem`, `YoutubeMatchResult` types (Task 2); `@vercel/kv`.
- Produces: `getFreshEpisodes()`, `getLastGoodEpisodes()`, `setEpisodesSnapshot(episodes)`, `getCachedYoutubeMatch(episodeId)`, `setCachedYoutubeMatch(episodeId, match)`, `getLowConfidenceEpisodeIds()`, `getCachedRetroList()`, `setCachedRetroList(items)` — all used by Task 7's data layer.

- [ ] **Step 1: Write the failing test**

Create `src/lib/cache.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const kvMock = {
  get: vi.fn(),
  set: vi.fn(),
  sadd: vi.fn(),
  smembers: vi.fn(),
};

vi.mock('@vercel/kv', () => ({ kv: kvMock }));

import {
  getFreshEpisodes,
  getLastGoodEpisodes,
  setEpisodesSnapshot,
  getCachedYoutubeMatch,
  setCachedYoutubeMatch,
  getLowConfidenceEpisodeIds,
  getCachedRetroList,
  setCachedRetroList,
} from './cache';

const sampleEpisodes = [
  {
    id: 'ep1',
    slug: 'ep-1',
    title: 'Ep 1',
    description: '',
    releaseDate: '2026-01-01',
    durationMs: 1,
    spotifyUrl: 'x',
    youtubeVideoId: null,
    youtubeMatchStatus: 'none' as const,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('episode snapshot cache', () => {
  it('getFreshEpisodes returns null when the freshness marker is absent', async () => {
    kvMock.get.mockResolvedValueOnce(null); // fresh marker
    const result = await getFreshEpisodes();
    expect(result).toBeNull();
  });

  it('getFreshEpisodes returns the snapshot when the freshness marker is present', async () => {
    kvMock.get.mockResolvedValueOnce(true); // fresh marker
    kvMock.get.mockResolvedValueOnce(sampleEpisodes); // snapshot
    const result = await getFreshEpisodes();
    expect(result).toEqual(sampleEpisodes);
  });

  it('setEpisodesSnapshot writes the snapshot and a TTL-bound freshness marker', async () => {
    await setEpisodesSnapshot(sampleEpisodes);
    expect(kvMock.set).toHaveBeenCalledWith('episodes:v1:snapshot', sampleEpisodes);
    expect(kvMock.set).toHaveBeenCalledWith('episodes:v1:fresh', true, { ex: 300 });
  });

  it('getLastGoodEpisodes reads the snapshot regardless of freshness', async () => {
    kvMock.get.mockResolvedValueOnce(sampleEpisodes);
    const result = await getLastGoodEpisodes();
    expect(result).toEqual(sampleEpisodes);
    expect(kvMock.get).toHaveBeenCalledWith('episodes:v1:snapshot');
  });
});

describe('youtube match cache', () => {
  it('stores a low-confidence match and logs it for review', async () => {
    await setCachedYoutubeMatch('ep1', { videoId: 'vid1', status: 'low_confidence', score: 0.4 });
    expect(kvMock.set).toHaveBeenCalledWith('youtube-match:ep1', {
      videoId: 'vid1',
      status: 'low_confidence',
      score: 0.4,
    });
    expect(kvMock.sadd).toHaveBeenCalledWith('youtube-match:low-confidence-log', 'ep1');
  });

  it('does not log a confirmed match', async () => {
    await setCachedYoutubeMatch('ep1', { videoId: 'vid1', status: 'confirmed', score: 0.9 });
    expect(kvMock.sadd).not.toHaveBeenCalled();
  });

  it('getLowConfidenceEpisodeIds returns the logged set', async () => {
    kvMock.smembers.mockResolvedValueOnce(['ep1', 'ep2']);
    expect(await getLowConfidenceEpisodeIds()).toEqual(['ep1', 'ep2']);
  });

  it('getCachedYoutubeMatch reads by episode id', async () => {
    kvMock.get.mockResolvedValueOnce({ videoId: 'vid1', status: 'confirmed', score: 0.9 });
    const result = await getCachedYoutubeMatch('ep1');
    expect(result).toEqual({ videoId: 'vid1', status: 'confirmed', score: 0.9 });
    expect(kvMock.get).toHaveBeenCalledWith('youtube-match:ep1');
  });
});

describe('retro list cache', () => {
  it('round-trips through get/set with no TTL', async () => {
    const items = [{ id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', submittedBy: 'A', notes: '' }];
    await setCachedRetroList(items);
    expect(kvMock.set).toHaveBeenCalledWith('retro-list:v1', items);

    kvMock.get.mockResolvedValueOnce(items);
    expect(await getCachedRetroList()).toEqual(items);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/cache.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the cache layer**

Create `src/lib/cache.ts`:
```ts
import { kv } from '@vercel/kv';
import type { Episode, RetroListItem, YoutubeMatchResult } from './types';

const EPISODES_SNAPSHOT_KEY = 'episodes:v1:snapshot';
const EPISODES_FRESH_KEY = 'episodes:v1:fresh';
const EPISODES_TTL_SECONDS = 300; // 5 min

const YOUTUBE_MATCH_KEY = (episodeId: string) => `youtube-match:${episodeId}`;
const LOW_CONFIDENCE_LOG_KEY = 'youtube-match:low-confidence-log';

const RETRO_LIST_KEY = 'retro-list:v1';

export async function getFreshEpisodes(): Promise<Episode[] | null> {
  const isFresh = await kv.get(EPISODES_FRESH_KEY);
  if (!isFresh) return null;
  return (await kv.get<Episode[]>(EPISODES_SNAPSHOT_KEY)) ?? null;
}

export async function getLastGoodEpisodes(): Promise<Episode[] | null> {
  return (await kv.get<Episode[]>(EPISODES_SNAPSHOT_KEY)) ?? null;
}

export async function setEpisodesSnapshot(episodes: Episode[]): Promise<void> {
  await kv.set(EPISODES_SNAPSHOT_KEY, episodes);
  await kv.set(EPISODES_FRESH_KEY, true, { ex: EPISODES_TTL_SECONDS });
}

export async function getCachedYoutubeMatch(episodeId: string): Promise<YoutubeMatchResult | null> {
  return (await kv.get<YoutubeMatchResult>(YOUTUBE_MATCH_KEY(episodeId))) ?? null;
}

export async function setCachedYoutubeMatch(episodeId: string, match: YoutubeMatchResult): Promise<void> {
  await kv.set(YOUTUBE_MATCH_KEY(episodeId), match);
  if (match.status === 'low_confidence') {
    await kv.sadd(LOW_CONFIDENCE_LOG_KEY, episodeId);
  }
}

export async function getLowConfidenceEpisodeIds(): Promise<string[]> {
  return (await kv.smembers<string>(LOW_CONFIDENCE_LOG_KEY)) ?? [];
}

export async function getCachedRetroList(): Promise<RetroListItem[] | null> {
  return (await kv.get<RetroListItem[]>(RETRO_LIST_KEY)) ?? null;
}

export async function setCachedRetroList(items: RetroListItem[]): Promise<void> {
  await kv.set(RETRO_LIST_KEY, items);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/cache.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Vercel KV cache layer for episodes, youtube matches, retro list"
```

---

### Task 7: Data layer (combines clients + cache, stale-serve fallback, mock-data switch)

**Files:**
- Create: `src/lib/mockData.ts`
- Create: `src/lib/data.ts`
- Test: `src/lib/data.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2-6 (`fetchAllSpotifyEpisodes`, `fetchChannelUploads`, `matchEpisodeToUpload`, `fetchRetroListRows`, `mapSheetRowsToRetroList`, all `cache.ts` functions, `getRequiredEnv`).
- Produces: `getEpisodes(): Promise<Episode[]>`, `getEpisodeBySlug(slug: string): Promise<Episode | null>`, `getRetroList(): Promise<RetroListItem[]>`, `refreshRetroList(): Promise<RetroListItem[]>` — used by Task 8 (API routes) and Tasks 10-13 (pages).

- [ ] **Step 1: Add mock fixtures (used by tests now, and by e2e in Task 15)**

Create `src/lib/mockData.ts`:
```ts
import type { Episode, RetroListItem } from './types';

export const mockEpisodes: Episode[] = [
  {
    id: 'mock-ep-1',
    slug: 'mock-episode-one',
    title: 'Mock Episode One',
    description: 'A fixture episode used for local/e2e testing.',
    releaseDate: '2026-01-01',
    durationMs: 3_600_000,
    spotifyUrl: 'https://open.spotify.com/episode/mock-ep-1',
    youtubeVideoId: 'dQw4w9WgXcQ',
    youtubeMatchStatus: 'confirmed',
  },
];

export const mockRetroList: RetroListItem[] = [
  { id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', submittedBy: 'TestUser', notes: 'Great pick' },
];
```

- [ ] **Step 2: Write the failing test for getEpisodes' stale-serve fallback**

Create `src/lib/data.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./spotify', () => ({ fetchAllSpotifyEpisodes: vi.fn() }));
vi.mock('./youtube', () => ({ fetchChannelUploads: vi.fn(), matchEpisodeToUpload: vi.fn() }));
vi.mock('./sheets', () => ({ fetchRetroListRows: vi.fn(), mapSheetRowsToRetroList: vi.fn() }));
vi.mock('./cache', () => ({
  getFreshEpisodes: vi.fn(),
  getLastGoodEpisodes: vi.fn(),
  setEpisodesSnapshot: vi.fn(),
  getCachedYoutubeMatch: vi.fn(),
  setCachedYoutubeMatch: vi.fn(),
  getCachedRetroList: vi.fn(),
  setCachedRetroList: vi.fn(),
}));

import { fetchAllSpotifyEpisodes } from './spotify';
import { fetchChannelUploads, matchEpisodeToUpload } from './youtube';
import {
  getFreshEpisodes,
  getLastGoodEpisodes,
  setEpisodesSnapshot,
  getCachedYoutubeMatch,
  setCachedYoutubeMatch,
} from './cache';
import { getEpisodes } from './data';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SPOTIFY_SHOW_ID = 'show1';
  process.env.YOUTUBE_CHANNEL_ID = 'channel1';
  delete process.env.MOCK_DATA;
});

describe('getEpisodes', () => {
  it('returns the fresh cached snapshot without calling external APIs', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue([
      {
        id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01',
        durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none',
      },
    ]);

    const result = await getEpisodes();

    expect(result).toHaveLength(1);
    expect(fetchAllSpotifyEpisodes).not.toHaveBeenCalled();
  });

  it('builds fresh data, matching new episodes against youtube uploads once', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(fetchAllSpotifyEpisodes).mockResolvedValue([
      { id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01', durationMs: 1, spotifyUrl: 'x' },
    ]);
    vi.mocked(fetchChannelUploads).mockResolvedValue([]);
    vi.mocked(getCachedYoutubeMatch).mockResolvedValue(null);
    vi.mocked(matchEpisodeToUpload).mockReturnValue({ videoId: null, status: 'none', score: 0 });

    const result = await getEpisodes();

    expect(result[0].youtubeMatchStatus).toBe('none');
    expect(setCachedYoutubeMatch).toHaveBeenCalledWith('ep1', { videoId: null, status: 'none', score: 0 });
    expect(setEpisodesSnapshot).toHaveBeenCalled();
  });

  it('falls back to the last-good snapshot when a live fetch fails', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(fetchAllSpotifyEpisodes).mockRejectedValue(new Error('Spotify down'));
    vi.mocked(getLastGoodEpisodes).mockResolvedValue([
      {
        id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01',
        durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none',
      },
    ]);

    const result = await getEpisodes();

    expect(result).toHaveLength(1);
  });

  it('re-throws when there is no fresh data and no last-good snapshot', async () => {
    vi.mocked(getFreshEpisodes).mockResolvedValue(null);
    vi.mocked(fetchAllSpotifyEpisodes).mockRejectedValue(new Error('Spotify down'));
    vi.mocked(getLastGoodEpisodes).mockResolvedValue(null);

    await expect(getEpisodes()).rejects.toThrow('Spotify down');
  });

  it('returns mock episodes when MOCK_DATA=true, bypassing all external calls', async () => {
    process.env.MOCK_DATA = 'true';
    const result = await getEpisodes();
    expect(result[0].id).toBe('mock-ep-1');
    expect(fetchAllSpotifyEpisodes).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/lib/data.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the data layer**

Create `src/lib/data.ts`:
```ts
import { fetchAllSpotifyEpisodes } from './spotify';
import { fetchChannelUploads, matchEpisodeToUpload } from './youtube';
import { fetchRetroListRows, mapSheetRowsToRetroList } from './sheets';
import {
  getFreshEpisodes,
  getLastGoodEpisodes,
  setEpisodesSnapshot,
  getCachedYoutubeMatch,
  setCachedYoutubeMatch,
  getCachedRetroList,
  setCachedRetroList,
} from './cache';
import { getRequiredEnv } from './env';
import { mockEpisodes, mockRetroList } from './mockData';
import type { Episode, RetroListItem } from './types';

export async function getEpisodes(): Promise<Episode[]> {
  if (process.env.MOCK_DATA === 'true') return mockEpisodes;

  const fresh = await getFreshEpisodes();
  if (fresh) return fresh;

  try {
    const showId = getRequiredEnv('SPOTIFY_SHOW_ID');
    const channelId = getRequiredEnv('YOUTUBE_CHANNEL_ID');

    const baseEpisodes = await fetchAllSpotifyEpisodes(showId);
    const uploads = await fetchChannelUploads(channelId);

    const episodes: Episode[] = [];
    for (const base of baseEpisodes) {
      let match = await getCachedYoutubeMatch(base.id);
      if (!match) {
        match = matchEpisodeToUpload(base, uploads);
        await setCachedYoutubeMatch(base.id, match);
      }
      episodes.push({
        ...base,
        youtubeVideoId: match.status === 'none' ? null : match.videoId,
        youtubeMatchStatus: match.status,
      });
    }

    await setEpisodesSnapshot(episodes);
    return episodes;
  } catch (err) {
    const lastGood = await getLastGoodEpisodes();
    if (lastGood) return lastGood;
    throw err;
  }
}

export async function getEpisodeBySlug(slug: string): Promise<Episode | null> {
  const episodes = await getEpisodes();
  return episodes.find((e) => e.slug === slug) ?? null;
}

export async function getRetroList(): Promise<RetroListItem[]> {
  if (process.env.MOCK_DATA === 'true') return mockRetroList;

  const cached = await getCachedRetroList();
  if (cached) return cached;
  return refreshRetroList();
}

export async function refreshRetroList(): Promise<RetroListItem[]> {
  const rows = await fetchRetroListRows();
  const items = mapSheetRowsToRetroList(rows);
  await setCachedRetroList(items);
  return items;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/data.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add data layer combining Spotify/YouTube/Sheets with cache fallback"
```

---

### Task 8: API routes (episodes, retro-list, revalidate, admin low-confidence view)

**Files:**
- Create: `src/app/api/episodes/route.ts`
- Test: `src/app/api/episodes/route.test.ts`
- Create: `src/app/api/retro-list/route.ts`
- Test: `src/app/api/retro-list/route.test.ts`
- Create: `src/app/api/revalidate/route.ts`
- Test: `src/app/api/revalidate/route.test.ts`
- Create: `src/app/api/admin/low-confidence-matches/route.ts`
- Test: `src/app/api/admin/low-confidence-matches/route.test.ts`

**Interfaces:**
- Consumes: `getEpisodes`, `getRetroList`, `refreshRetroList` (Task 7), `getLowConfidenceEpisodeIds` (Task 6).
- Produces: HTTP `GET /api/episodes`, `GET /api/retro-list`, `GET /api/revalidate`, `GET /api/admin/low-confidence-matches`.

- [ ] **Step 1: Write the failing test for the episodes route**

Create `src/app/api/episodes/route.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/data', () => ({ getEpisodes: vi.fn() }));
import { getEpisodes } from '@/lib/data';
import { GET } from './route';

describe('GET /api/episodes', () => {
  it('returns episodes as JSON', async () => {
    vi.mocked(getEpisodes).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns 503 when getEpisodes throws', async () => {
    vi.mocked(getEpisodes).mockRejectedValue(new Error('down'));
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/episodes/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the episodes route**

Create `src/app/api/episodes/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { getEpisodes } from '@/lib/data';

export async function GET() {
  try {
    const episodes = await getEpisodes();
    return NextResponse.json(episodes);
  } catch {
    return NextResponse.json({ error: 'Episodes temporarily unavailable' }, { status: 503 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/episodes/route.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for the retro-list route**

Create `src/app/api/retro-list/route.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/data', () => ({ getRetroList: vi.fn() }));
import { getRetroList } from '@/lib/data';
import { GET } from './route';

describe('GET /api/retro-list', () => {
  it('returns retro list items as JSON', async () => {
    vi.mocked(getRetroList).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns 503 when getRetroList throws', async () => {
    vi.mocked(getRetroList).mockRejectedValue(new Error('down'));
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- src/app/api/retro-list/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement the retro-list route**

Create `src/app/api/retro-list/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { getRetroList } from '@/lib/data';

export async function GET() {
  try {
    const items = await getRetroList();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: 'Retro list temporarily unavailable' }, { status: 503 });
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- src/app/api/retro-list/route.test.ts`
Expected: PASS

- [ ] **Step 9: Write the failing test for the revalidate route**

Create `src/app/api/revalidate/route.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/data', () => ({ refreshRetroList: vi.fn() }));
import { refreshRetroList } from '@/lib/data';
import { GET } from './route';

describe('GET /api/revalidate', () => {
  beforeEachEnv();

  function beforeEachEnv() {
    process.env.REVALIDATE_SECRET = 'webhook-secret';
    process.env.CRON_SECRET = 'cron-secret';
  }

  it('rejects requests with no valid secret or cron header', async () => {
    const req = new NextRequest('http://localhost/api/revalidate');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('accepts the Apps Script webhook via query secret', async () => {
    vi.mocked(refreshRetroList).mockResolvedValue([{ id: 'row-0', game: 'G', platform: 'P', submittedBy: 'S', notes: '' }]);
    const req = new NextRequest('http://localhost/api/revalidate?secret=webhook-secret');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 1 });
  });

  it('accepts Vercel Cron via the Authorization header', async () => {
    vi.mocked(refreshRetroList).mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/revalidate', {
      headers: { authorization: 'Bearer cron-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm test -- src/app/api/revalidate/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 11: Implement the revalidate route**

Create `src/app/api/revalidate/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { refreshRetroList } from '@/lib/data';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const isCron = Boolean(process.env.CRON_SECRET) && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const secretParam = request.nextUrl.searchParams.get('secret');
  const isWebhook = Boolean(process.env.REVALIDATE_SECRET) && secretParam === process.env.REVALIDATE_SECRET;

  if (!isCron && !isWebhook) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await refreshRetroList();
    return NextResponse.json({ ok: true, count: items.length });
  } catch {
    return NextResponse.json({ error: 'Refresh failed' }, { status: 503 });
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test -- src/app/api/revalidate/route.test.ts`
Expected: PASS

- [ ] **Step 13: Write the failing test for the admin low-confidence-matches route**

Create `src/app/api/admin/low-confidence-matches/route.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/cache', () => ({ getLowConfidenceEpisodeIds: vi.fn() }));
vi.mock('@/lib/data', () => ({ getEpisodes: vi.fn() }));
import { getLowConfidenceEpisodeIds } from '@/lib/cache';
import { getEpisodes } from '@/lib/data';
import { GET } from './route';

describe('GET /api/admin/low-confidence-matches', () => {
  beforeEach(() => {
    process.env.REVALIDATE_SECRET = 'admin-secret';
  });

  it('rejects requests without the secret', async () => {
    const req = new NextRequest('http://localhost/api/admin/low-confidence-matches');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns only flagged episodes when the secret matches', async () => {
    vi.mocked(getLowConfidenceEpisodeIds).mockResolvedValue(['ep2']);
    vi.mocked(getEpisodes).mockResolvedValue([
      { id: 'ep1', slug: 'ep-1', title: 'Ep 1', description: '', releaseDate: '2026-01-01', durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none' },
      { id: 'ep2', slug: 'ep-2', title: 'Ep 2', description: '', releaseDate: '2026-01-02', durationMs: 1, spotifyUrl: 'y', youtubeVideoId: 'vid2', youtubeMatchStatus: 'low_confidence' },
    ]);

    const req = new NextRequest('http://localhost/api/admin/low-confidence-matches?secret=admin-secret');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('ep2');
  });
});
```

- [ ] **Step 14: Run test to verify it fails**

Run: `npm test -- src/app/api/admin/low-confidence-matches/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 15: Implement the admin route**

Create `src/app/api/admin/low-confidence-matches/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { getLowConfidenceEpisodeIds } from '@/lib/cache';
import { getEpisodes } from '@/lib/data';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ids = await getLowConfidenceEpisodeIds();
  const episodes = await getEpisodes();
  const flagged = episodes.filter((e) => ids.includes(e.id));
  return NextResponse.json(flagged);
}
```

- [ ] **Step 16: Run test to verify it passes**

Run: `npm test -- src/app/api/admin/low-confidence-matches/route.test.ts`
Expected: PASS

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "feat: add episodes, retro-list, revalidate, and admin API routes"
```

---

### Task 9: SearchableList and SpoilerCard components

**Files:**
- Create: `src/components/SearchableList.tsx`
- Test: `src/components/SearchableList.test.tsx`
- Create: `src/components/SpoilerCard.tsx`
- Test: `src/components/SpoilerCard.test.tsx`

**Interfaces:**
- Produces: `SearchableList<T>({ items, searchKeys, placeholder, renderItem, getKey })` — used by Tasks 10 and 12. `SpoilerCard({ label, children })` — used by Task 13.

- [ ] **Step 1: Write the failing test for SearchableList**

Create `src/components/SearchableList.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchableList } from './SearchableList';

interface Item {
  id: string;
  name: string;
}

const items: Item[] = [
  { id: '1', name: 'Chrono Trigger' },
  { id: '2', name: 'Super Metroid' },
];

describe('SearchableList', () => {
  it('renders all items with no query', () => {
    render(
      <SearchableList
        items={items}
        searchKeys={['name']}
        placeholder="Search..."
        getKey={(i) => i.id}
        renderItem={(i) => i.name}
      />
    );
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument();
    expect(screen.getByText('Super Metroid')).toBeInTheDocument();
  });

  it('filters items as the user types', () => {
    render(
      <SearchableList
        items={items}
        searchKeys={['name']}
        placeholder="Search..."
        getKey={(i) => i.id}
        renderItem={(i) => i.name}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'Chrono' } });
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument();
    expect(screen.queryByText('Super Metroid')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/SearchableList.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement SearchableList**

Create `src/components/SearchableList.tsx`:
```tsx
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Fuse from 'fuse.js';

interface SearchableListProps<T> {
  items: T[];
  searchKeys: string[];
  placeholder: string;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}

export function SearchableList<T>({
  items,
  searchKeys,
  placeholder,
  getKey,
  renderItem,
}: SearchableListProps<T>) {
  const [query, setQuery] = useState('');
  const fuse = useMemo(() => new Fuse(items, { keys: searchKeys, threshold: 0.35 }), [items, searchKeys]);
  const results = useMemo(
    () => (query.trim() ? fuse.search(query).map((r) => r.item) : items),
    [query, fuse, items]
  );

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <ul>
        {results.map((item) => (
          <li key={getKey(item)}>{renderItem(item)}</li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/SearchableList.test.tsx`
Expected: PASS

- [ ] **Step 5: Write the failing test for SpoilerCard**

Create `src/components/SpoilerCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpoilerCard } from './SpoilerCard';

describe('SpoilerCard', () => {
  it('shows the label and hides content until hovered', () => {
    render(<SpoilerCard label="Reveal me">Chrono Trigger</SpoilerCard>);
    expect(screen.getByText('Reveal me')).toBeInTheDocument();
    expect(screen.queryByText('Chrono Trigger')).not.toBeInTheDocument();
  });

  it('reveals content on hover and hides it again on mouse leave', () => {
    render(<SpoilerCard label="Reveal me">Chrono Trigger</SpoilerCard>);
    const card = screen.getByRole('button');
    fireEvent.mouseEnter(card);
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument();
    fireEvent.mouseLeave(card);
    expect(screen.queryByText('Chrono Trigger')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- src/components/SpoilerCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement SpoilerCard**

Create `src/components/SpoilerCard.tsx`:
```tsx
'use client';

import { useState, type ReactNode } from 'react';

interface SpoilerCardProps {
  label: string;
  children: ReactNode;
}

export function SpoilerCard({ label, children }: SpoilerCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      tabIndex={0}
      role="button"
      aria-label={`${label}: hover or focus to reveal`}
      style={{ filter: revealed ? 'none' : undefined, cursor: 'pointer' }}
    >
      {revealed ? children : label}
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- src/components/SpoilerCard.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add SearchableList and SpoilerCard components"
```

---

### Task 10: Episode Archive page

**Files:**
- Create: `src/app/episodes/page.tsx`
- Create: `src/app/episodes/EpisodeArchiveClient.tsx`
- Test: `src/app/episodes/EpisodeArchiveClient.test.tsx`

**Interfaces:**
- Consumes: `getEpisodes` (Task 7), `SearchableList` (Task 9), `Episode` type (Task 2).
- Produces: page at route `/episodes`.

- [ ] **Step 1: Write the failing test for the client component**

Create `src/app/episodes/EpisodeArchiveClient.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EpisodeArchiveClient } from './EpisodeArchiveClient';
import type { Episode } from '@/lib/types';

const episodes: Episode[] = [
  {
    id: 'ep1', slug: 'episode-one', title: 'Episode One', description: '', releaseDate: '2026-01-01',
    durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none',
  },
  {
    id: 'ep2', slug: 'episode-two', title: 'Episode Two', description: '', releaseDate: '2026-01-08',
    durationMs: 1, spotifyUrl: 'y', youtubeVideoId: null, youtubeMatchStatus: 'none',
  },
];

describe('EpisodeArchiveClient', () => {
  it('lists episode titles as links to their detail page', () => {
    render(<EpisodeArchiveClient episodes={episodes} />);
    const link = screen.getByText(/Episode One/) as HTMLElement;
    expect(link.closest('a')).toHaveAttribute('href', '/episodes/episode-one');
  });

  it('filters by search', () => {
    render(<EpisodeArchiveClient episodes={episodes} />);
    fireEvent.change(screen.getByPlaceholderText('Search episodes...'), { target: { value: 'One' } });
    expect(screen.getByText(/Episode One/)).toBeInTheDocument();
    expect(screen.queryByText(/Episode Two/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/episodes/EpisodeArchiveClient.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the client component and page**

Create `src/app/episodes/EpisodeArchiveClient.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { SearchableList } from '@/components/SearchableList';
import type { Episode } from '@/lib/types';

export function EpisodeArchiveClient({ episodes }: { episodes: Episode[] }) {
  return (
    <SearchableList
      items={episodes}
      searchKeys={['title']}
      placeholder="Search episodes..."
      getKey={(e) => e.id}
      renderItem={(e) => (
        <Link href={`/episodes/${e.slug}`}>
          {e.title} — {e.releaseDate}
        </Link>
      )}
    />
  );
}
```

Create `src/app/episodes/page.tsx`:
```tsx
import { getEpisodes } from '@/lib/data';
import { EpisodeArchiveClient } from './EpisodeArchiveClient';

export const dynamic = 'force-dynamic'; // fetch at request time, not build time

export default async function EpisodesPage() {
  const episodes = await getEpisodes();
  return (
    <main>
      <h1>Episodes</h1>
      <EpisodeArchiveClient episodes={episodes} />
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/episodes/EpisodeArchiveClient.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add episode archive page with search"
```

---

### Task 11: Episode Detail page (Spotify + YouTube embeds)

**Files:**
- Create: `src/components/SpotifyEmbed.tsx`
- Create: `src/components/YoutubeEmbed.tsx`
- Create: `src/app/episodes/[slug]/page.tsx`
- Test: `src/components/SpotifyEmbed.test.tsx`
- Test: `src/components/YoutubeEmbed.test.tsx`

**Interfaces:**
- Consumes: `getEpisodeBySlug` (Task 7).
- Produces: page at route `/episodes/[slug]`; `SpotifyEmbed({ episodeId })`, `YoutubeEmbed({ videoId })`.

- [ ] **Step 1: Write the failing tests for the embed components**

Create `src/components/SpotifyEmbed.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpotifyEmbed } from './SpotifyEmbed';

describe('SpotifyEmbed', () => {
  it('renders an iframe pointed at the Spotify embed URL for the episode', () => {
    render(<SpotifyEmbed episodeId="ep1" />);
    const iframe = screen.getByTitle('Spotify episode player');
    expect(iframe).toHaveAttribute('src', 'https://open.spotify.com/embed/episode/ep1');
  });
});
```

Create `src/components/YoutubeEmbed.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YoutubeEmbed } from './YoutubeEmbed';

describe('YoutubeEmbed', () => {
  it('renders an iframe pointed at the YouTube embed URL for the video', () => {
    render(<YoutubeEmbed videoId="vid1" />);
    const iframe = screen.getByTitle('YouTube episode video');
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/vid1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/SpotifyEmbed.test.tsx src/components/YoutubeEmbed.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the embed components**

Create `src/components/SpotifyEmbed.tsx`:
```tsx
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
```

Create `src/components/YoutubeEmbed.tsx`:
```tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/SpotifyEmbed.test.tsx src/components/YoutubeEmbed.test.tsx`
Expected: PASS

- [ ] **Step 5: Implement the episode detail page**

Create `src/app/episodes/[slug]/page.tsx`:
```tsx
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
      <h1>{episode.title}</h1>
      <p>{episode.releaseDate}</p>
      <p>{episode.description}</p>
      <SpotifyEmbed episodeId={episode.id} />
      {episode.youtubeVideoId && <YoutubeEmbed videoId={episode.youtubeVideoId} />}
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add episode detail page with Spotify and YouTube embeds"
```

---

### Task 12: Retro Master List page

**Files:**
- Create: `src/app/retro-list/page.tsx`
- Create: `src/app/retro-list/RetroListClient.tsx`
- Test: `src/app/retro-list/RetroListClient.test.tsx`

**Interfaces:**
- Consumes: `getRetroList` (Task 7), `SearchableList` (Task 9).
- Produces: page at route `/retro-list`.

- [ ] **Step 1: Write the failing test**

Create `src/app/retro-list/RetroListClient.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetroListClient } from './RetroListClient';
import type { RetroListItem } from '@/lib/types';

const items: RetroListItem[] = [
  { id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', submittedBy: 'Alice', notes: '' },
  { id: 'row-1', game: 'Super Metroid', platform: 'SNES', submittedBy: 'Bob', notes: '' },
];

describe('RetroListClient', () => {
  it('lists all games with platform and submitter', () => {
    render(<RetroListClient items={items} />);
    expect(screen.getByText(/Chrono Trigger/)).toBeInTheDocument();
    expect(screen.getByText(/Super Metroid/)).toBeInTheDocument();
  });

  it('filters by search across game, platform, and submitter', () => {
    render(<RetroListClient items={items} />);
    fireEvent.change(screen.getByPlaceholderText('Search games...'), { target: { value: 'Chrono' } });
    expect(screen.getByText(/Chrono Trigger/)).toBeInTheDocument();
    expect(screen.queryByText(/Super Metroid/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/retro-list/RetroListClient.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the client component and page**

Create `src/app/retro-list/RetroListClient.tsx`:
```tsx
'use client';

import { SearchableList } from '@/components/SearchableList';
import type { RetroListItem } from '@/lib/types';

export function RetroListClient({ items }: { items: RetroListItem[] }) {
  return (
    <SearchableList
      items={items}
      searchKeys={['game', 'platform', 'submittedBy']}
      placeholder="Search games..."
      getKey={(i) => i.id}
      renderItem={(i) => (
        <span>
          {i.game} — {i.platform} (submitted by {i.submittedBy})
        </span>
      )}
    />
  );
}
```

Create `src/app/retro-list/page.tsx`:
```tsx
import { getRetroList } from '@/lib/data';
import { RetroListClient } from './RetroListClient';

export const dynamic = 'force-dynamic';

export default async function RetroListPage() {
  const items = await getRetroList();
  return (
    <main>
      <h1>Retro Master List</h1>
      <RetroListClient items={items} />
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/retro-list/RetroListClient.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Retro Master List page with search"
```

---

### Task 13: Home page (latest episode + spoiler-tagged Game of the Week)

**Files:**
- Create: `src/app/page.tsx` (overwrite the scaffold default)
- Test: `src/app/HomeContent.test.tsx`
- Create: `src/app/HomeContent.tsx`

**Interfaces:**
- Consumes: `getEpisodes`, `getRetroList` (Task 7), `SpotifyEmbed` (Task 11), `SpoilerCard` (Task 9).
- Produces: page at route `/`. `HomeContent({ latestEpisode, gameOfTheWeek })` (presentational, so it's testable without hitting the data layer).

**Note:** "Game of the Week" is taken as the last row of the Retro Master List (the most recently added entry) — confirm this selection rule matches how you actually want the weekly pick chosen; it's straightforward to change later since it's isolated to `HomeContent`'s caller.

- [ ] **Step 1: Write the failing test for HomeContent**

Create `src/app/HomeContent.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeContent } from './HomeContent';
import type { Episode, RetroListItem } from '@/lib/types';

const episode: Episode = {
  id: 'ep1', slug: 'episode-one', title: 'Episode One', description: '', releaseDate: '2026-01-01',
  durationMs: 1, spotifyUrl: 'x', youtubeVideoId: null, youtubeMatchStatus: 'none',
};

const gameOfTheWeek: RetroListItem = {
  id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', submittedBy: 'Alice', notes: '',
};

describe('HomeContent', () => {
  it('shows the latest episode title and embed', () => {
    render(<HomeContent latestEpisode={episode} gameOfTheWeek={gameOfTheWeek} />);
    expect(screen.getByText('Episode One')).toBeInTheDocument();
    expect(screen.getByTitle('Spotify episode player')).toBeInTheDocument();
  });

  it('hides the Game of the Week pick until hovered', () => {
    render(<HomeContent latestEpisode={episode} gameOfTheWeek={gameOfTheWeek} />);
    expect(screen.queryByText(/Chrono Trigger/)).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('button'));
    expect(screen.getByText(/Chrono Trigger/)).toBeInTheDocument();
  });

  it('renders nothing for missing sections gracefully', () => {
    render(<HomeContent latestEpisode={null} gameOfTheWeek={null} />);
    expect(screen.queryByTitle('Spotify episode player')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/HomeContent.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement HomeContent and the page**

Create `src/app/HomeContent.tsx`:
```tsx
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
```

Overwrite `src/app/page.tsx`:
```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/HomeContent.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add home page with latest episode and spoiler-tagged Game of the Week"
```

---

### Task 14: Layout, nav, footer, and About page

**Files:**
- Modify: `src/app/layout.tsx` (overwrite scaffold default)
- Create: `src/app/about/page.tsx`
- Test: `src/app/Nav.test.tsx`
- Create: `src/app/Nav.tsx`

**Interfaces:**
- Produces: `Nav()` component; global layout wrapping every page with nav/footer.

- [ ] **Step 1: Write the failing test for Nav**

Create `src/app/Nav.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nav } from './Nav';

describe('Nav', () => {
  it('links to every top-level page', () => {
    render(<Nav />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Episodes' })).toHaveAttribute('href', '/episodes');
    expect(screen.getByRole('link', { name: 'Retro Master List' })).toHaveAttribute('href', '/retro-list');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/Nav.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Nav, layout, and About page**

Create `src/app/Nav.tsx`:
```tsx
import Link from 'next/link';

export function Nav() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/episodes">Episodes</Link>
      <Link href="/retro-list">Retro Master List</Link>
      <Link href="/about">About</Link>
    </nav>
  );
}
```

Overwrite `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { Nav } from './Nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'New Game Plus Podcast',
  description: 'Retro gaming podcast — searchable episode archive and Retro Master List',
};

const FOOTER_LINKS = [
  { label: 'Spotify', href: 'https://open.spotify.com/show/REPLACE_WITH_SHOW_ID' },
  { label: 'YouTube', href: 'https://www.youtube.com/REPLACE_WITH_CHANNEL_HANDLE' },
  { label: 'Apple Podcasts', href: 'https://podcasts.apple.com/REPLACE_WITH_SHOW_URL' },
  { label: 'Twitter/X', href: 'https://x.com/REPLACE_WITH_HANDLE' },
  { label: 'Discord', href: 'https://discord.gg/REPLACE_WITH_INVITE' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
        <footer>
          {FOOTER_LINKS.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </footer>
      </body>
    </html>
  );
}
```

`FOOTER_LINKS` holds placeholder URLs — replace each `REPLACE_WITH_*` with the
real link during setup (see README).

Create `src/app/about/page.tsx`:
```tsx
export default function AboutPage() {
  return (
    <main>
      <h1>About New Game Plus Podcast</h1>
      <p>
        New Game Plus Podcast is a retro gaming podcast. Browse nearly 600 episodes in our
        archive, or check out the Retro Master List — the games our listeners have submitted
        for us to play on the show.
      </p>
      <h2>Contact</h2>
      <p>
        Reach the show at <a href="mailto:REPLACE_WITH_CONTACT_EMAIL">REPLACE_WITH_CONTACT_EMAIL</a>,
        or through any of the links in the footer below.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/Nav.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add global nav, footer, and about page"
```

---

### Task 15: Playwright e2e smoke tests

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `mockEpisodes`, `mockRetroList` (Task 7, via the `MOCK_DATA=true` env switch already wired into `getEpisodes`/`getRetroList`).

- [ ] **Step 1: Configure Playwright to run the app with mock data**

Create `playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run build && npm run start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: { MOCK_DATA: 'true' },
  },
  use: { baseURL: 'http://localhost:3000' },
});
```

- [ ] **Step 2: Write the smoke test spec**

Create `e2e/smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('episode archive search narrows to a matching episode', async ({ page }) => {
  await page.goto('/episodes');
  await page.getByLabel('Search episodes...').fill('Mock');
  await expect(page.getByText('Mock Episode One')).toBeVisible();
});

test('episode detail page renders both embeds', async ({ page }) => {
  await page.goto('/episodes/mock-episode-one');
  await expect(page.locator('iframe[title="Spotify episode player"]')).toBeVisible();
  await expect(page.locator('iframe[title="YouTube episode video"]')).toBeVisible();
});

test('retro list page renders and searches', async ({ page }) => {
  await page.goto('/retro-list');
  await expect(page.getByText('Chrono Trigger')).toBeVisible();
  await page.getByLabel('Search games...').fill('Chrono');
  await expect(page.getByText('Chrono Trigger')).toBeVisible();
});

test('home page shows latest episode and a spoiler-tagged game of the week', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Mock Episode One')).toBeVisible();
  await expect(page.getByText('Chrono Trigger')).toBeHidden();
  await page.getByRole('button').hover();
  await expect(page.getByText(/Chrono Trigger/)).toBeVisible();
});
```

- [ ] **Step 3: Run the e2e suite**

Run: `npm run test:e2e`
Expected: PASS (4 tests). If a selector doesn't match (e.g. exact visible text), adjust the test to the actual rendered markup — don't change the pages just to satisfy the test.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add Playwright e2e smoke tests against mock data"
```

---

### Task 16: Deployment config and setup docs

**Files:**
- Create: `vercel.json`
- Create: `README.md` (overwrite scaffold default)

**Interfaces:**
- None — this task wires up hosting config and documents the manual setup steps (API keys, Sheet sharing, Apps Script) that can't be automated from within the repo.

- [ ] **Step 1: Add the Vercel Cron config for the Retro List safety-net refresh**

Create `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/revalidate", "schedule": "*/15 * * * *" }
  ]
}
```

- [ ] **Step 2: Write the setup README**

Overwrite `README.md`:
````markdown
# New Game Plus Podcast — Site

Next.js site for ngppodcast.com: searchable episode archive (Spotify + YouTube
embeds) and a Retro Master List. See
`docs/superpowers/specs/2026-09-12-ngppodcast-site-rebuild-design.md` for the
full design and `docs/superpowers/plans/2026-09-12-ngppodcast-site-rebuild.md`
for how it was built.

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in the values below
npm run dev
```

Run `npm test` for unit/integration tests, `npm run test:e2e` for Playwright
smoke tests (these run against mock data, no live API keys required).

## Required environment variables

| Variable | Where to get it |
| --- | --- |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Spotify Developer Dashboard → create an app (client credentials flow, no user login needed) |
| `SPOTIFY_SHOW_ID` | The show's Spotify ID, from its `open.spotify.com/show/<id>` URL |
| `YOUTUBE_API_KEY` | Google Cloud Console → enable "YouTube Data API v3" → create an API key |
| `YOUTUBE_CHANNEL_ID` | The channel's ID (Channel → About → Share → Copy channel ID) |
| `GOOGLE_SHEETS_API_KEY` | Google Cloud Console → enable "Google Sheets API" → create an API key (can be the same key as YouTube's) |
| `RETRO_LIST_SHEET_ID` | The Sheet's ID from its URL: `docs.google.com/spreadsheets/d/<id>/edit` |
| `RETRO_LIST_RANGE` | e.g. `Sheet1!A:D` — adjust to match the real tab name and column range |
| `REVALIDATE_SECRET` | Any random string you generate — shared between this app and the Apps Script webhook below |
| `CRON_SECRET` | Any random string you generate — Vercel automatically sends it as `Authorization: Bearer <value>` on Cron requests once set as a Vercel env var |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | From the Vercel KV dashboard once you attach a KV store to this project |

**The Retro Master List Google Sheet must be shared as "Anyone with the link —
Viewer"** so the Sheets API can read it with just an API key. Its header row
must contain (case-insensitive) `game`, `platform`, `submitted_by`, and
`notes` columns — if your real Sheet uses different header text, update the
column lookups in `src/lib/sheets.ts`.

## Near-instant Retro List updates (Apps Script webhook)

In the Google Sheet: Extensions → Apps Script, paste and save, then add an
"On edit" installable trigger for `onEditTrigger`:

```javascript
function onEditTrigger(e) {
  var url = 'https://<your-deployed-domain>/api/revalidate?secret=<REVALIDATE_SECRET value>';
  UrlFetchApp.fetch(url);
}
```

This calls the revalidation endpoint every time the Sheet is edited. The
15-minute Vercel Cron job (`vercel.json`) is the fallback if this ever
doesn't fire.

## Deploying

1. Push this repo to GitHub.
2. Import it into Vercel, attach a Vercel KV store (free tier), and set all
   the environment variables above in the Vercel project settings.
3. Deploy. The site will be live on its `*.vercel.app` URL.
4. **Do not point ngppodcast.com at this deployment without explicit
   go-ahead** — that domain cutover is a separate, deliberate step once the
   new site has been reviewed on its Vercel URL.
````

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add deployment config and setup README"
```
