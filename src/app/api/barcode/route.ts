import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const TMDB_BASE = 'https://api.themoviedb.org/3'

type CacheRow = {
  upc: string
  tmdb_id: number | null
  title: string | null
  year: number | null
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const upc = req.nextUrl.searchParams.get('upc')?.trim()
  if (!upc) return NextResponse.json({ error: 'Missing upc' }, { status: 400 })

  const token = process.env.TMDB_TOKEN
  if (!token) return NextResponse.json({ error: 'TMDB token not configured' }, { status: 500 })

  const tmdbHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // --- Check cache ---
  const { data: cached } = await supabase
    .from('barcode_cache')
    .select('upc, tmdb_id, title, year')
    .eq('upc', upc)
    .maybeSingle() as { data: CacheRow | null }

  let tmdbId: number | null = cached?.tmdb_id ?? null
  let baseTitle: string | null = cached?.title ?? null
  let baseYear: number | null = cached?.year ?? null

  // --- Cache miss: look up UPC ---
  if (!cached) {
    try {
      const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`)
      if (upcRes.ok) {
        const upcData = await upcRes.json()
        const item = upcData.items?.[0]
        if (item?.title) {
          baseTitle = item.title as string
        }
      }
    } catch {
      // UPCitemdb failed — continue with TMDB find-by-external-id fallback
    }

    // --- Try TMDB /find with UPC as external id (works for some discs) ---
    if (!tmdbId) {
      try {
        const findRes = await fetch(
          `${TMDB_BASE}/find/${upc}?external_source=dvd_id`,
          { headers: tmdbHeaders }
        )
        if (findRes.ok) {
          const findData = await findRes.json()
          const hit = findData.movie_results?.[0]
          if (hit) {
            tmdbId = hit.id
            if (!baseTitle) baseTitle = hit.title
            if (!baseYear && hit.release_date) baseYear = parseInt(hit.release_date.split('-')[0])
          }
        }
      } catch { /* ignore */ }
    }

    // --- Search TMDB by title if we got one from UPCitemdb ---
    if (!tmdbId && baseTitle) {
      try {
        const searchRes = await fetch(
          `${TMDB_BASE}/search/movie?query=${encodeURIComponent(baseTitle)}&language=en-US&page=1`,
          { headers: tmdbHeaders }
        )
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          const hit = searchData.results?.[0]
          if (hit) {
            tmdbId = hit.id
            baseTitle = hit.title ?? baseTitle
            if (!baseYear && hit.release_date) baseYear = parseInt(hit.release_date.split('-')[0])
          }
        }
      } catch { /* ignore */ }
    }

    // Store in cache (even a partial miss, so we don't re-hit UPCitemdb for the same UPC)
    await supabase.from('barcode_cache').insert({ upc, tmdb_id: tmdbId, title: baseTitle, year: baseYear })
  }

  if (!tmdbId && !baseTitle) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // --- Fetch full TMDB details ---
  let posterUrl: string | null = null
  let director: string | null = null
  let mpaaRating: string | null = null
  let genre: string | null = null
  let title = baseTitle ?? ''
  let year = baseYear

  if (tmdbId) {
    try {
      const [detailRes, creditsRes, releasesRes] = await Promise.all([
        fetch(`${TMDB_BASE}/movie/${tmdbId}?language=en-US`, { headers: tmdbHeaders }),
        fetch(`${TMDB_BASE}/movie/${tmdbId}/credits`, { headers: tmdbHeaders }),
        fetch(`${TMDB_BASE}/movie/${tmdbId}/release_dates`, { headers: tmdbHeaders }),
      ])

      if (detailRes.ok) {
        const detail = await detailRes.json()
        title = detail.title ?? title
        if (!year && detail.release_date) year = parseInt(detail.release_date.split('-')[0])
        if (detail.poster_path) posterUrl = `https://image.tmdb.org/t/p/w500${detail.poster_path}`
        genre = detail.genres?.map((g: { name: string }) => g.name).join(', ') || null
      }

      if (creditsRes.ok) {
        const credits = await creditsRes.json()
        const dir = credits.crew?.find((c: { job: string; name: string }) => c.job === 'Director')
        director = dir?.name ?? null
      }

      if (releasesRes.ok) {
        const releases = await releasesRes.json()
        const usRelease = releases.results?.find((r: { iso_3166_1: string }) => r.iso_3166_1 === 'US')
        mpaaRating = usRelease?.release_dates?.find(
          (d: { certification: string }) => d.certification
        )?.certification ?? null
      }
    } catch { /* return what we have */ }
  }

  return NextResponse.json({ title, year, tmdb_id: tmdbId, poster_url: posterUrl, director, mpaa_rating: mpaaRating, genre })
}
