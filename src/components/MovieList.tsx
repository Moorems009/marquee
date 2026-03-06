'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
const supabase = createClient()

type Movie = {
  id: string
  title: string
  year: number
  format: string
}

export default function MovieList() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchMovies() {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('title', { ascending: true })

    if (!error && data) setMovies(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchMovies()
  }, [])

  if (loading) return <p>Loading...</p>
  if (movies.length === 0) return <p>No movies yet. Add some!</p>

  return (
    <ul>
      {movies.map((movie) => (
        <li key={movie.id}>
          {movie.title} ({movie.year}) — {movie.format}
        </li>
      ))}
    </ul>
  )
}