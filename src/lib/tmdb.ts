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

export async function getMovieRating(tmdbId: number) {
  const res = await fetch(`/api/tmdb?action=rating&id=${tmdbId}`)
  if (!res.ok) return { mpaa_rating: null }
  return res.json()
}

export async function getMovieGenre(tmdbId: number) {
  const res = await fetch(`/api/tmdb?action=genre&id=${tmdbId}`)
  if (!res.ok) return { genre: null }
  return res.json()
}

export function getPosterUrl(posterPath: string, size: 'w92' | 'w500' = 'w500') {
  return `https://image.tmdb.org/t/p/${size}${posterPath}`
}

export async function searchTVShows(query: string) {
  const res = await fetch(`/api/tmdb?action=search_tv&query=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  return res.json()
}

export async function getTVDetails(tvId: number): Promise<{ creator: string | null; genre: string | null; poster_path: string | null }> {
  const res = await fetch(`/api/tmdb?action=tv_details&id=${tvId}`)
  if (!res.ok) return { creator: null, genre: null, poster_path: null }
  return res.json()
}

export async function getTVSeasonDetails(tvId: number, season: number): Promise<{ air_date: string | null; poster_path: string | null; tv_rating: string | null }> {
  const res = await fetch(`/api/tmdb?action=tv_season&id=${tvId}&season=${season}`)
  if (!res.ok) return { air_date: null, poster_path: null, tv_rating: null }
  return res.json()
}

export async function searchCollection(query: string) {
  const res = await fetch(`/api/tmdb?action=search_collection&query=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  return res.json()
}

export async function getCollectionParts(collectionId: number) {
  const res = await fetch(`/api/tmdb?action=collection_parts&id=${collectionId}`)
  if (!res.ok) return []
  return res.json()
}
