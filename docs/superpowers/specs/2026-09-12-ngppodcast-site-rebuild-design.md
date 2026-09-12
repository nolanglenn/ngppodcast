# New Game Plus Podcast — Site Rebuild Design

Date: 2026-09-12
Status: Draft for review

## Summary

Replace outdated ngppodcast.com WordPress site with fresh ground-up build. Core
value: let listeners/viewers search ~600 existing episodes and land on a page
with the Spotify episode widget and YouTube video embed (when one exists).
Secondary v1 feature: a viewable/searchable "Retro Master List" (retro games
listeners have submitted, currently a Google Sheet) replacing an external link
to the raw sheet.

## Goals

- Fix maintenance burden of current WordPress site (simpler stack, less
  ongoing upkeep).
- Fresh design/visual identity.
- Searchable episode archive → episode detail page with Spotify + YouTube
  embeds.
- Viewable/searchable Retro Master List page (read-only in v1).
- Near-zero hosting cost.
- Near-instant reflection of new episodes / Retro List edits.
- Eventually take over the ngppodcast.com domain — **explicit go-ahead
  required before that cutover; do not do it as a side effect of shipping.**

## Non-goals (v1)

- Retro Master List game submission form (deferred to later iteration).
- Guest/host bios, merch/store, blog, sponsor pages.
- Real-time (sub-second) updates — "near-instant" (seconds-to-low-minutes)
  is sufficient.

## Architecture

Next.js (App Router), deployed on Vercel free tier. Three external data
sources, no dedicated database:

- **Spotify Web API** — episode list/metadata (source of truth for episodes).
- **YouTube Data API** — matches an episode to a channel video by
  title/date search.
- **Google Sheets API** — Retro Master List rows (source of truth for that
  list).

Serverless API routes fetch and cache this data. **Vercel KV** holds two
caches: (1) YouTube match results per episode (so we don't re-search on every
request), and (2) a snapshot of the Retro Master List sheet. KV is a cache
only — Spotify and the Sheet remain authoritative.

Freshness strategy:
- Episode data: short server-side cache (~2–5 min).
- Retro Master List: instant refresh via a Google Apps Script bound to the
  Sheet, calling a Vercel on-demand revalidation endpoint on edit; a 15-min
  periodic revalidation runs as a safety net if the webhook doesn't fire.

## Pages / Components

- **Home** — latest episode, a "Game of the Week" card pulling the latest
  Retro List pick (spoiler-tagged: hidden/blurred, reveals on hover), links
  to Spotify/YouTube/socials/subscribe.
- **Episode Archive** (`/episodes`) — full list of episodes, client-side
  search (Fuse.js) by title (guest/tag search possible later once that data
  exists).
- **Episode Detail** (`/episodes/[slug]`) — title, description, date,
  Spotify embed widget, YouTube embed if a confident match exists.
- **Retro Master List** (`/retro-list`) — viewable table/grid of the Sheet's
  contents, client-side searchable (Fuse.js). Columns to be confirmed against
  the actual Sheet during implementation. Read-only in v1.
- **About/Contact** — static page.
- Global nav/footer with Spotify/YouTube/socials links.

## Data Flow

1. **Episodes:** API route calls Spotify for the show's episode list on
   request, cached ~5 min. First time an episode is seen, YouTube Data API
   searches the channel for a matching video by title/date; the result
   (video ID, or "no match", or "low-confidence") is saved to KV so the
   search never repeats for that episode.
2. **Retro Master List:** API route pulls Sheet rows via Sheets API into KV.
   Apps Script trigger on the Sheet calls a revalidation endpoint on edit;
   periodic 15-min revalidation is the fallback path.
3. **Search:** Both the episode archive and the Retro List ship their full
   (small, ~600-row) dataset to the client once; Fuse.js searches in-browser,
   no per-keystroke server round trip.

## Error Handling

- Any external API (Spotify/YouTube/Sheets) down or rate-limited → serve
  last-good cached data from KV rather than break the page; log the failure.
- YouTube no-match or low-confidence match → episode page omits the YouTube
  embed (Spotify widget still renders). Low-confidence matches are logged
  somewhere reviewable (simple admin view or a KV list) so a human can
  confirm/correct later — never shown to the public unconfirmed.
- Sheet revalidation webhook fails or is unreachable → the 15-min periodic
  fallback still keeps data from going stale indefinitely.
- Malformed/incomplete Sheet row → skip that row, log it, don't crash the
  page.

## Testing

- Unit tests: Spotify episode → internal model mapping; YouTube
  match-confidence scoring; Sheet row → Retro List item mapping.
- Integration tests for API routes against mocked Spotify/YouTube/Sheets
  responses — no live external calls in CI.
- Playwright smoke tests: archive search returns results, episode page
  renders both embeds, Retro List page renders and searches.
- Manual review pass on real data before domain cutover: spot-check a sample
  of episodes and confirm YouTube matches look right.

## Open Items For Implementation Time

- Exact Retro Master List column set (confirm against the live Sheet).
- Spotify/YouTube/Google API credentials and quota limits.
- Domain cutover from current WordPress ngppodcast.com is a separate,
  explicitly-approved step after the new site is verified — not part of this
  build.
