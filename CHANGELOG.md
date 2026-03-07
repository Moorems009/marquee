# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [Unreleased]

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
