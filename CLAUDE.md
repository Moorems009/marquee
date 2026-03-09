# Marquee — Project Brief

## Overview
Marquee is a personal physical media movie library app. Users can catalogue their movie collection (Blu-ray, 4K, DVD, etc.), browse by list or grid view, and organize with labels.

## Stack
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Styling**: Tailwind CSS v4 with custom design tokens registered via `@theme` in `globals.css`
- **Movie Metadata**: TMDB API (The Movie Database)
- **Hosting**: Vercel (pending)
- **Repo**: https://github.com/Moorems009/marquee.git

## File Structure
```
src/
  app/
    auth/
      page.tsx          ← Sign in / sign up page
    page.tsx            ← Home page (protected, renders MovieLibrary)
    globals.css         ← CSS variables and body styles
  components/
    MovieLibrary.tsx    ← Thin parent component, layout + state orchestration
    AddMovieForm.tsx    ← Add movie form with TMDB autocomplete
    MovieList.tsx       ← List/grid view toggle + movie rows/cards
    EditMovieModal.tsx  ← Edit/delete modal with TMDB autocomplete + labels
    ImportCSVModal.tsx  ← CSV bulk import with progress bar + duplicate handling
  hooks/
    useMovies.ts        ← fetchMovies, insertMovie, updateMovie, deleteMovie
    useLabels.ts        ← fetchLabels, fetchMovieLabels, createLabel, addLabelToMovie, removeLabelFromMovie, deleteLabel
  lib/
    supabase.ts         ← Browser Supabase client
    supabase-server.ts  ← Server-side Supabase client
    tmdb.ts             ← TMDB fetch functions (searchMovies, getMovieCredits, getPosterUrl)
    types.ts            ← Shared types: Movie, Label, TMDBResult
    styles.ts           ← Shared styles: inputStyle, fieldLabelStyle, sectionHeadingStyle
```

## Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_TMDB_TOKEN=
```
Note: TMDB token is currently public (NEXT_PUBLIC_). Before going live this should be moved to a server-side API route.

## Database Schema (Supabase/PostgreSQL)

### movies
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| created_at | timestamptz | |
| title | text | |
| year | int4 | |
| format | text | 4K, Blu-ray, DVD, VHS, Digital |
| director | text | nullable |
| imprint | text | nullable (e.g. Criterion, Arrow) |
| poster_url | text | nullable, from TMDB |
| user_id | uuid | FK to auth.users |
| last_watched | timestamptz | nullable, not yet used in UI |

### labels
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| created_at | timestamptz | |
| name | text | |
| user_id | uuid | FK to auth.users |

### movie_labels
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| movie_id | uuid | FK to movies.id |
| label_id | uuid | FK to labels.id |

## Design System
Styling uses Tailwind CSS v4. Design tokens are registered in `globals.css` via `@theme` and are available as Tailwind utilities (e.g. `text-navy`, `bg-cream`, `border-powder-blue`, `font-serif`). CSS variables in `:root` are also kept for any remaining inline style needs.

### Color Palette (Tailwind utilities)
| Token | Value | Usage |
|-------|-------|-------|
| `cream` | #F5F0E8 | page background |
| `blush` | #E8A0A0 | list row accent border |
| `powder-blue` | #A8C4D4 | borders, buttons, inputs |
| `mint` | #A8C9B4 | format badge, progress bar |
| `butter` | #F0D882 | label pills |
| `dusty-rose` | #C4747C | headings, delete actions |
| `navy` | #2C3E6B | primary text |
| `warm-gray` | #8C7B6B | secondary text, placeholders |

### Typography
- Font: `font-serif` (Georgia, serif) throughout
- Headings: `uppercase tracking-widest text-dusty-rose`
- Field labels: `uppercase tracking-wider text-xs text-warm-gray`

### Shared Styles (`src/lib/styles.ts`)
- `inputStyle` — applied to all inputs and selects
- `fieldLabelStyle` — applied to all field labels
- `sectionHeadingStyle` — applied to section/modal headings

## Features Built
- Email/password authentication (sign in, sign up, sign out)
- Per-user movie libraries filtered by user_id
- Add movies with TMDB autocomplete (title, year, director, poster auto-filled)
- List view and grid view toggle
- Edit modal with TMDB autocomplete, save, and delete
- Labels: create, assign to movies, remove from movies, delete entirely
- Labels shown as butter-yellow pills on movie rows
- Settings menu (gear icon ⚙ top right) with email display, Import CSV, Sign Out
- CSV bulk import with:
  - Quoted field parsing (handles titles with commas)
  - TMDB auto-fill for missing poster/director during import
  - Format normalization (e.g. "4K UHD" → "4K", "Blu-Ray" → "Blu-ray")
  - Format warnings shown in preview for unrecognized values
  - Duplicate detection by title + year with skip/overwrite choice
  - Progress bar during import
  - Import summary (imported / skipped / errors)

## Pending Features / Known Issues
- **TMDB token is public** — should be proxied through a Next.js API route (`/api/tmdb`) so the token stays server-side
- Search and filter library by title, director, label, format
- Sort library by title, year, director, format
- Session expiry handling — expired sessions should redirect to /auth gracefully
- Error boundaries to prevent full page crashes
- Loading skeletons instead of plain "Loading..." text
- Poster override in edit modal (if TMDB pulled the wrong movie)
- "Pick a movie" random recommendation feature
- `last_watched` field exists in DB but is not yet surfaced in the UI

## Conventions
- All components use `'use client'` directive
- Data fetching lives in hooks (`useMovies`, `useLabels`), not in components
- Shared types live in `src/lib/types.ts`
- Shared styles live in `src/lib/styles.ts`
- TMDB functions live in `src/lib/tmdb.ts`
- No form tags — use button onClick handlers instead
- Avoid mixing `border` shorthand with `borderLeft` etc. — use individual border properties to avoid React styling warnings