export type Movie = {
  id: string
  title: string
  year: number
  format: string
  imprint: string | null
  director: string | null
  poster_url: string | null
}

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