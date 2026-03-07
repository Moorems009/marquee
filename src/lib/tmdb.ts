const TMDB_BASE = 'https://api.themoviedb.org/3'
const token = process.env.NEXT_PUBLIC_TMDB_TOKEN

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
}

export async function searchMovies(query: string) {
  const res = await fetch(
    `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=1`,
    { headers }
  )
  const data = await res.json()
  return data.results?.slice(0, 6) || []
}

export async function getMovieCredits(tmdbId: number) {
  const res = await fetch(`${TMDB_BASE}/movie/${tmdbId}/credits`, { headers })
  const data = await res.json()
  const director = data.crew?.find((c: { job: string; name: string }) => c.job === 'Director')
  return { director: director?.name || '' }
}

export function getPosterUrl(posterPath: string, size: 'w92' | 'w500' = 'w500') {
  return `https://image.tmdb.org/t/p/${size}${posterPath}`
}