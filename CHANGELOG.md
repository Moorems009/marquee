# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [Unreleased]

---


## [0.30.0] - 2026-03-08

### feat
- Night mode support for Now Playing marquee — `NowPlayingMarquee` accepts a `nightMode` prop and switches between explicit `DAY`/`NIGHT` color palettes
- Night palette: electric cyan border with glow, hot-magenta neon strips with neon bloom, deep blue-black panel, gold string-light bulbs, light blue title text
- `MovieLibrary` passes `nightMode` state down to `NowPlayingMarquee`

---


## [0.29.0] - 2026-03-08

### fix
- Fix label filter always returning no results — root cause: Supabase returns integer IDs as JS numbers, but HTML `<select>` `e.target.value` is always a string, so `[5].includes("5")` evaluated to `false`
- Normalize all label IDs to strings at the source: `fetchLabels` and `fetchMovieLabels` now coerce `id` to `String(id)` before storing in state
- `MovieList` filter check coerces `movie.id` and label IDs to strings before comparison
- Fix duplicate label prevention in `EditMovieModal` — the existing `el.id === l.id` guard was also broken by the integer/string mismatch; now uses `String()` coercion
- Add explicit duplicate guard in `onSelectExistingLabel` (MovieLibrary): skips `addLabelToMovie` if the label is already in `editMovieLabels`

---


## [0.28.0] - 2026-03-08

### fix
- Fix label filter returning no results — root cause: missing SELECT RLS policy on `movie_labels` causes `fetchMovieLabels` to return 0 rows and reset `movieLabels` to `{}` after every operation
- Switch `addLabelToMovie` and `removeLabelFromMovie` to optimistic state updates: `movieLabels` is updated directly in memory on INSERT/DELETE, no longer dependent on a successful SELECT round-trip
- Remove `fetchMovieLabels()` calls from `handleSave` and `handleDelete`
- `fetchMovieLabels` now only writes state when `mlData.length > 0`, preventing an empty SELECT from wiping valid in-memory label state
- `addLabelToMovie` signature changed from `(movieId, labelId: string)` to `(movieId, label: Label)`

---


## [0.27.0] - 2026-03-08

### fix
- Fix label filtering returning no results (useLabels.ts)
  - `fetchMovieLabels` was using a Supabase embedded join (`labels(id, name)`) which silently failed if the FK relationship wasn't recognized by PostgREST, leaving `movieLabels` as `{}` permanently
  - Labels appeared in the edit modal via optimistic state updates but were never persisted to the `movieLabels` map used by the filter
  - Replaced with two parallel plain queries (`movie_labels` + `labels`) and a client-side join by label ID — no embedded join, no silent failure

---


## [0.26.0] - 2026-03-08

### feat
- Rename "Library" → "Shelf" across all UI-visible text
  - "Add to your library" → "Add to your shelf" (AddMovieForm heading)
  - "Already in your library as…" → "Already in your shelf as…" (AddMovieForm duplicate warning)
  - "My Library" → "My Shelf" (MovieList section heading)
  - "Library Data" → "Shelf Data" (SettingsModal section label and description)
  - "already exists in your library" → "already exists in your shelf" (ImportCSVModal duplicate prompt)
  - "Your personal physical media library." → "Your personal physical media shelf." (welcome banner)

---


## [0.25.0] - 2026-03-08

### feat
- Make Add Movie form collapsible (collapsed by default)
  - Toggle button `+ Add a movie` / `− Add a movie` above the form
  - Form auto-stays open after a successful add
  - Welcome banner "Add a movie ↓" button expands the form
- Update welcome banner to mention the Now Playing marquee feature
  - Second paragraph: "Once you have movies, open any title and click **Now Playing** to feature it on the marquee above."

---


## [0.23.0] - 2026-03-08

### feat
- Add Now Playing marquee section above the Add Movie form
  - Displays up to 3 user-selected movies in a theater marquee layout
  - White sign board with dusty-rose neon strips top/bottom, butter-yellow bulb row at bottom
  - 3 equal panels side by side; each shows title (bold navy) + year/director (italic warm-gray)
  - Empty slots show dash placeholders
  - "Now Playing" header in italic dusty-rose above the sign
  - Pinned via "Now Playing" button in the Edit modal; "Remove from Now Playing" when active
  - Button disabled when all 3 slots are filled and the movie is not already pinned
  - Persisted to `user_metadata.settings.nowPlaying` (array of movie IDs); restored on page load

---


## [0.22.0] - 2026-03-08

### feat
- Remove "Default View" setting from Settings modal
  - View mode (list/grid) now auto-persists on every toggle — no explicit save required
  - `handleViewModeChange` writes to `user_metadata.settings.defaultView` on each toggle
  - Settings modal `UserSettings` type reduced to `{ nightMode: boolean }`

---


## [0.21.0] - 2026-03-08

### feat
- Add first-time user welcome banner in MovieLibrary
  - Shown once on first visit, keyed off `user_metadata.settings.hasSeenWelcome`
  - Directs users to the Add Movie form or Import CSV
  - Dismissed by ×, "Add a movie ↓", or "Import CSV" (which also opens the modal)
  - All dismiss paths persist `hasSeenWelcome: true` to Supabase, merging with existing settings

---


## [0.20.0] - 2026-03-08

### feat
- CSV import now accepts Title as the only required column; all other columns are optional
- Add fallback format selector in CSV import step 1 — applied to rows with no format or an unrecognized format
  - Options: Blu-ray (default), 4K, DVD, VHS, Digital, Leave Blank
  - "Leave Blank" stores an empty format string so the movie can be updated later
  - Preview note shows the current fallback selection when format warnings are present
  - Format warnings now also flag rows with no format at all (previously silent)

---


## [0.19.0] - 2026-03-08

### feat
- Add Mann Mode (night theme) toggleable in Settings, inspired by Michael Mann's *Thief* (1981)
  - Deep blue-black background, electric cyan format badges, hot magenta label pills, string-light gold headings
  - Implemented via `.night` CSS class overriding all `--color-*` design tokens in `globals.css` — no JSX class-swapping needed
  - Toggle switch in Settings modal with smooth slide animation and 44px+ touch target
  - Persists to Supabase user metadata alongside `defaultView`; restored on next page load
- Add duplicate prevention to Add Movie form (AddMovieForm.tsx)
  - Inline warning when title + year + format match an existing entry
  - Two-step confirm: first submit shows "Add anyway" button in dusty-rose; second submit proceeds
- Add duplicate prevention to CSV import (ImportCSVModal.tsx)
  - Duplicate key: title + year + normalized format
  - Per-row skip/overwrite choice
  - "Skip all duplicates" and "Overwrite all duplicates" bulk action buttons when more than one duplicate is detected

### fix
- Remove "4K UHD" as a format option from Add Movie form and Edit modal (non-standard; normalized to "4K" on import)

---


## [0.18.0] - 2026-03-08

### feat
- Replace "Loading..." text with animated skeleton UI in MovieList
  - List view: 6 skeleton rows matching the poster + title + badge layout
  - Grid view: 12 skeleton cards matching the poster + title layout
  - Uses `animate-pulse` with powder-blue/mint palette tints

---


## [0.17.0] - 2026-03-08

### feat
- Add collapsible search, filter, and sort panel to movie library (MovieList.tsx)
  - Search by title or director (text input)
  - Filter by format (dropdown) and label (dropdown)
  - Sort by title (A→Z / Z→A), year (newest / oldest), director (by last name), format, genre, rating
  - Filter button shows active filter count with dusty-rose accent when filters are applied
  - "Clear filters" button resets all filters
  - "No movies match your filters." shown when filters return no results

### fix
- Normalize movie format on edit modal open (MovieLibrary.tsx) — movies with non-standard format strings (e.g. "Blu Ray") now default to "Blu-ray" so the format dropdown saves correctly

---


## [0.16.0] - 2026-03-08

### chore
- Convert auth/page.tsx fully to Tailwind — centered layout, branded sign-in form using shared inputStyle/fieldLabelStyle
- Update CLAUDE.md to reflect Tailwind CSS v4 as the styling approach

---


## [0.15.0] - 2026-03-08

### chore
- Convert ImportCSVModal.tsx fully to Tailwind — no inline styles remain (except dynamic progress bar width)
- Convert statusColor inline style to statusClass Tailwind class function
- Convert SettingsModal.tsx fully to Tailwind — no inline styles remain (except dynamic progress bar width)
- Replace viewButtonStyle inline style function with viewBtnClass Tailwind class function

---


## [0.14.0] - 2026-03-08

### chore
- Convert EditMovieModal.tsx fully to Tailwind — no inline styles remain
- Replace JS onMouseEnter/Leave hover handlers with Tailwind hover:bg-cream on TMDB and label dropdowns

---


## [0.13.0] - 2026-03-08

### chore
- Convert MovieList.tsx fully to Tailwind — no inline styles remain (except aspect-ratio and auto-fill grid which lack direct Tailwind equivalents)
- Replace JS onMouseEnter/Leave scale handler on grid cards with Tailwind hover:scale-[1.03]
- Left accent border on list rows uses border-l-4 border-l-blush alongside border border-powder-blue

---


## [0.12.0] - 2026-03-08

### chore
- Convert AddMovieForm.tsx fully to Tailwind — no inline styles remain
- Responsive two-row grid layout: stacks vertically on mobile, proportional columns on desktop (md:grid-cols-[3fr_2fr_1fr] and md:grid-cols-[1fr_3fr_auto])
- Replace JS onMouseEnter/Leave hover handlers with Tailwind hover:bg-cream on TMDB dropdown items

---


## [0.11.0] - 2026-03-08

### chore
- Convert MovieLibrary.tsx fully to Tailwind — no inline styles remain
- Replace JS onMouseEnter/Leave hover handlers with Tailwind hover: classes
- Add responsive outer padding (px-4 py-6 on mobile, px-8 py-8 on md+)

---

## [0.10.0] - 2026-03-08

### chore
- Activate Tailwind CSS v4 (already a dependency); added @import "tailwindcss" and registered design tokens in a @theme block so colors and font are available as Tailwind utilities (text-navy, bg-cream, border-powder-blue, font-serif, etc.)
- Add .vscode/settings.json to suppress built-in CSS linter warning for the @theme at-rule
- Convert src/lib/styles.ts from inline style objects to Tailwind class strings (inputStyle, fieldLabelStyle, sectionHeadingStyle)
- Update AddMovieForm, EditMovieModal, ImportCSVModal, and SettingsModal to apply shared styles via className instead of style; remaining per-element overrides stay as inline styles

---

## [0.9.0] - 2026-03-07

### feat
- Add `genre text` column to the `movies` table in Supabase
- Pull genre from TMDB `/movie/{id}` (genres array joined as comma-separated string) via new `action=genre` handler in the server-side API proxy
- Add `getMovieGenre()` to `src/lib/tmdb.ts`
- Auto-fill `genre` on TMDB selection in Add Movie form and Edit modal
- Fetch and store `genre` during CSV bulk import
- Include `genre` in Refresh TMDB Data — fills missing genre for existing library movies
- Display genre as small italic text below the title/director line in list view and below format badges in grid view
- Add editable Genre field to Edit modal

---

## [0.8.0] - 2026-03-07

### feat
- Add "Refresh TMDB Data" button to Settings modal under a new Library Data section
- For each movie missing poster, director, or MPAA rating: searches TMDB, fetches only the missing fields (credits and rating fetched in parallel), and updates Supabase
- Shows a progress bar while running and a summary on completion
- Lists any movies not found on TMDB in a scrollable box by title and year
- Refreshes the library automatically on completion
- Modal container gains maxHeight + overflowY scroll to handle long not-found lists

---

## [0.7.0] - 2026-03-07

### feat
- Pull MPAA rating from TMDB `/movie/{id}/release_dates` (US certification) via new `action=rating` handler in the server-side API proxy
- Add `getMovieRating()` to `src/lib/tmdb.ts`
- Auto-fill `mpaa_rating` on TMDB selection in Add Movie form and Edit modal
- Fetch and store `mpaa_rating` during CSV bulk import
- Display MPAA rating as an outlined badge in list view (between imprint and Edit button) and grid view (below imprint)
- Add editable MPAA Rating field to Edit modal
- Add `mpaa_rating text` column to the `movies` table in Supabase

---

## [0.6.0] - 2026-03-07

### feat
- Display imprint as a powder-blue badge in list view (alongside the format badge) and grid view (inline next to format)
- Remove old inline italic [imprint] text from list view

---

## [0.5.1] - 2026-03-07

### chore
- Rename src/middleware.ts to src/proxy.ts and export function middleware to export function proxy per Next.js 16 deprecation

---

## [0.5.0] - 2026-03-07

### feat
- Add `src/middleware.ts` to check session server-side on every request; unauthenticated users are redirected to `/auth` before the page renders
- Replace one-time session check in `page.tsx` with `onAuthStateChange` listener so an expired session redirects to `/auth` automatically while the page is open

---

## [0.4.1] - 2026-03-07

### chore
- Add `NOTES.md` for tracking deployment steps and operational reminders

---

## [0.4.0] - 2026-03-07

### feat
- Proxy all TMDB API calls through a server-side Next.js route (`/api/tmdb`) so the token is never exposed to the client
- API route requires an authenticated Supabase session before forwarding requests

### chore
- Rename env var from `NEXT_PUBLIC_TMDB_TOKEN` to `TMDB_TOKEN` in `.env.local`

---

## [0.3.0] - 2026-03-07

### feat
- Add `ErrorBoundary` class component with a "Try again" fallback UI
- Wrap `AddMovieForm` and `MovieList` in independent error boundaries so a crash in one section does not affect the other
- Wrap `EditMovieModal`, `SettingsModal`, and `ImportCSVModal` in error boundaries that dismiss the modal on reset

---

## [0.2.0] - 2026-03-07

### feat
- Add user settings modal accessible from the gear menu
- Persist default view preference (list or grid) in Supabase user metadata
- Apply saved default view on page load

---

## [0.1.0] - 2026-03-06

### feat
- Scaffold Next.js 15 project with TypeScript, ESLint, and PostCSS
- Connect Supabase browser and server clients
- Add email/password authentication (sign in, sign up, sign out) via Supabase Auth
- Filter movie library per authenticated user via `user_id`
- Add movie entry form with title, year, format, director, and imprint fields
- Add list view and grid view toggle for the movie library
- Integrate TMDB API for movie search autocomplete on add and edit
- Auto-fill director and poster from TMDB on movie selection
- Display movie posters as thumbnails in list and grid views
- Add labels system: create, assign to movies, remove from movies, delete entirely
- Show labels as pill badges on movie rows and cards
- Add settings gear menu (top right) with signed-in email display, Import CSV, and Sign Out
- Add CSV bulk import modal with progress bar and import summary
  - Quoted field parsing (handles titles with commas)
  - TMDB auto-fill for director and poster during import
  - Format normalization (e.g. `4K UHD` → `4K`, `Blu-Ray` → `Blu-ray`)
  - Format warnings in preview for unrecognized values
  - Duplicate detection by title + year with skip or overwrite choice

### fix
- Handle quoted fields containing commas in CSV parser

### refactor
- Extract data fetching into `useMovies` and `useLabels` hooks
- Extract shared types into `src/lib/types.ts`
- Extract shared styles into `src/lib/styles.ts`
- Extract TMDB fetch functions into `src/lib/tmdb.ts`
- Split monolithic page component into `MovieLibrary`, `MovieList`, `AddMovieForm`, and `EditMovieModal`

### chore
- Add `.gitignore` for Next.js and Node
- Add `CLAUDE.md` project brief and architecture reference
