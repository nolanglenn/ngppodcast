# New Game Plus Podcast — Site

Next.js site for ngppodcast.com: searchable episode archive (Spotify + YouTube
embeds) and a Retro Master List. See
`docs/superpowers/specs/2026-09-12-ngppodcast-site-rebuild-design.md` for the
full design and `docs/superpowers/plans/2026-09-12-ngppodcast-site-rebuild.md`
for how it was built.

## TODO before going live

- [ ] Get real credentials (Spotify, YouTube, Google Sheets) and fill in
      `.env.local` / Vercel env vars — see **Required environment variables**
      below.
- [ ] Replace the placeholder links — the site ships with these **broken
      until replaced**:

  | What | Where | Placeholder |
  | --- | --- | --- |
  | Footer links (Spotify, YouTube, Apple Podcasts, Twitter/X, Discord) | `FOOTER_LINKS` in `src/app/layout.tsx` | `REPLACE_WITH_SHOW_ID`, `REPLACE_WITH_CHANNEL_HANDLE`, `REPLACE_WITH_SHOW_URL`, `REPLACE_WITH_HANDLE`, `REPLACE_WITH_INVITE` |
  | Contact email | `src/app/about/page.tsx` | `REPLACE_WITH_CONTACT_EMAIL` |
  | Patreon button | `PATREON_URL` in `src/app/HomeContent.tsx` | `REPLACE_WITH_PATREON_HANDLE` |

  Search the repo for `REPLACE_WITH_` to find them all.
- [ ] Confirm the real Retro Master List sheet's header row matches what
      `src/lib/sheets.ts` expects, and that it's shared correctly (see
      **Required environment variables** below).
- [ ] Verify the "Game of the Week" row-order assumption against the real
      sheet (see below) — adjust `src/app/page.tsx` if it doesn't hold.
- [ ] Set up the Apps Script webhook and `CRON_SECRET` (see **Near-instant
      Retro List updates** below).
- [ ] Domain cutover to ngppodcast.com — last step, **requires explicit
      go-ahead**, not part of any of the above.

## Local development

### Fastest path — no credentials, no KV (`MOCK_DATA=true`)

You can run and test the whole site with **zero external API keys and no Vercel
KV setup** by turning on mock mode:

```bash
npm install
echo "MOCK_DATA=true" > .env.local
npm run dev
```

`MOCK_DATA=true` makes the data layer return the fixtures in
`src/lib/mockData.ts` instead of calling Spotify, YouTube, Google Sheets, or KV.
This is the easiest way to see the site running before any API keys exist.

**The value must be the exact string `true`** — `1`, `yes`, and `TRUE` do *not*
activate mock mode.

### With real data

```bash
npm install
cp .env.local.example .env.local   # fill in the values below
npm run dev
```

### Tests

```bash
npm test                 # unit/integration tests (vitest)

npx playwright install   # one-time, on a fresh clone — downloads the browsers
npm run test:e2e         # Playwright smoke tests
```

Both suites run against mock data — no live API keys required.

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
| `REVALIDATE_SECRET` | Any random string you generate — shared between this app and the Apps Script webhook below. **Anyone who can edit the Sheet can read this secret**, so it grants nothing but "refresh the retro list". |
| `ADMIN_SECRET` | A *different* random string — guards `/api/admin/low-confidence-matches?secret=...` (the review list of uncertain YouTube matches). Deliberately separate from `REVALIDATE_SECRET` so Sheet editors don't get admin access and either can be rotated alone. |
| `CRON_SECRET` | Any random string you generate — Vercel automatically sends it as `Authorization: Bearer <value>` on Cron requests once set as a Vercel env var. **If it isn't set as a Vercel env var, the daily cron job gets a 401 and silently does nothing.** |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Provided automatically once you add a KV/Redis store from the Vercel Marketplace (see Deploying) |
| `MOCK_DATA` | Optional. Set to the exact string `true` for local/mock mode; leave empty everywhere else. |

**The Retro Master List Google Sheet must be shared as "Anyone with the link —
Viewer"** so the Sheets API can read it with just an API key. Its header row
must contain (case-insensitive) `game`, `platform`, `submitted_by`, and
`notes` columns — if your real Sheet uses different header text, update the
column lookups in `src/lib/sheets.ts`. If the headers don't match, every row is
skipped: the app logs an error and refuses to cache the empty result (so it
retries rather than going silently blank forever), but the page stays empty
until the headers or the lookups are fixed.

### Verify the "Game of the Week" rule against the real sheet

The home page currently treats **the last row of the Retro Master List sheet**
as the Game of the Week. That is an assumption about how the sheet is
maintained, not a guaranteed-correct rule — check the real sheet's actual row
order during setup (is the newest pick appended at the bottom, inserted at the
top, or is there a separate "current pick" marker?) and adjust
`src/app/page.tsx` if it doesn't hold.

## Near-instant Retro List updates (Apps Script webhook)

In the Google Sheet: Extensions → Apps Script, paste and save, then add an
"On edit" installable trigger for `onEditTrigger`:

```javascript
function onEditTrigger(e) {
  var url = 'https://<your-deployed-domain>/api/revalidate?secret=<REVALIDATE_SECRET value>';
  UrlFetchApp.fetch(url);
}
```

**This webhook is the primary freshness mechanism** — it fires on every Sheet
edit, which is what delivers the near-instant updates the design calls for.

The Vercel Cron job in `vercel.json` runs **once daily (03:00 UTC)** and is only
a safety net: it guarantees the cached list never goes stale for more than a day
even if the webhook is never set up or stops firing. It is not what keeps the
list fresh day to day. (Vercel's free/Hobby tier limits cron jobs to once-daily
frequency, so a more frequent schedule would be rejected anyway.)

## Deploying

1. Push this repo to GitHub.
2. Import it into Vercel.
3. **Add a KV store.** Vercel KV is now provisioned through the **Vercel
   Marketplace**, not a first-party "Vercel KV dashboard": in the Vercel
   dashboard go to **Storage** (or search **Marketplace**), and add an
   Upstash/Redis-compatible KV integration to this project. A free tier is
   available. Connecting it to the project automatically injects
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` — you should not need to paste
   those in by hand.
4. Set all the other environment variables above in the Vercel project settings
   (Settings → Environment Variables). Don't forget `CRON_SECRET` — without it
   the daily cron job is rejected with 401 and does nothing.
5. Deploy. The site will be live on its `*.vercel.app` URL.
6. Replace the `REPLACE_WITH_*` placeholders (see the top of this README).
7. **Do not point ngppodcast.com at this deployment without explicit
   go-ahead** — that domain cutover is a separate, deliberate step once the
   new site has been reviewed on its Vercel URL.
