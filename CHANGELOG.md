# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [Unreleased]

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
