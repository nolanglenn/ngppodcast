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
