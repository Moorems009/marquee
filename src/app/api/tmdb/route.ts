import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const TMDB_BASE = 'https://api.themoviedb.org/3'

export async function GET(req: NextRequest) {
  // Require an authenticated session
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.TMDB_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'TMDB token not configured' }, { status: 500 })
  }

  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  if (action === 'search') {
    const query = searchParams.get('query') ?? ''
    const res = await fetch(
      `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=1`,
      { headers }
    )
    const data = await res.json()
    return NextResponse.json(data.results?.slice(0, 6) ?? [])
  }

  if (action === 'credits') {
    const id = searchParams.get('id') ?? ''
    const res = await fetch(`${TMDB_BASE}/movie/${id}/credits`, { headers })
    const data = await res.json()
    const director = data.crew?.find((c: { job: string; name: string }) => c.job === 'Director')
    return NextResponse.json({ director: director?.name ?? '' })
  }

  if (action === 'rating') {
    const id = searchParams.get('id') ?? ''
    const res = await fetch(`${TMDB_BASE}/movie/${id}/release_dates`, { headers })
    const data = await res.json()
    const usRelease = data.results?.find((r: { iso_3166_1: string }) => r.iso_3166_1 === 'US')
    const certification = usRelease?.release_dates?.find(
      (d: { certification: string }) => d.certification
    )?.certification ?? ''
    return NextResponse.json({ mpaa_rating: certification || null })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
