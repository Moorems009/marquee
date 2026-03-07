export async function searchMovies(query: string) {
  const res = await fetch(`/api/tmdb?action=search&query=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  return res.json()
}

export async function getMovieCredits(tmdbId: number) {
  const res = await fetch(`/api/tmdb?action=credits&id=${tmdbId}`)
  if (!res.ok) return { director: '' }
  return res.json()
}

export function getPosterUrl(posterPath: string, size: 'w92' | 'w500' = 'w500') {
  return `https://image.tmdb.org/t/p/${size}${posterPath}`
}
