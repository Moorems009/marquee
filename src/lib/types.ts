export type MediaItem = {
  id: string
  title: string
  year: number
  format: string
  imprint: string | null
  creator: string | null
  poster_url: string | null
  mpaa_rating: string | null
  genre: string | null
  item_type: 'movie' | 'tv_season'
  show_title: string | null
  season_number: number | null
}

// Backward-compat alias — prefer MediaItem in new code
export type Movie = MediaItem

export type Label = {
  id: string
  name: string
}

export type TMDBResult = {
  id: number
  title: string
  release_date: string
  poster_path: string | null
}

export type TVShowResult = {
  id: number
  name: string
  first_air_date: string
  poster_path: string | null
}
