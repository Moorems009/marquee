import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { MediaItem } from '@/lib/types'

export function useMovies() {
  const supabase = createClient()
  const [movies, setMovies] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchMovies() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('user_id', user?.id)
      .order('title', { ascending: true })

    if (!error && data) setMovies(data)
    setLoading(false)
  }

  async function insertMovie(movie: Omit<MediaItem, 'id'> & { user_id: string }) {
    const { error } = await supabase.from('media_items').insert([movie])
    if (!error) await fetchMovies()
    return { error }
  }

  async function updateMovie(id: string, updates: Partial<MediaItem>) {
    const { error } = await supabase.from('media_items').update(updates).eq('id', id)
    if (!error) await fetchMovies()
    return { error }
  }

  async function deleteMovie(id: string) {
    const { error } = await supabase.from('media_items').delete().eq('id', id)
    if (!error) await fetchMovies()
    return { error }
  }

  return { movies, loading, fetchMovies, insertMovie, updateMovie, deleteMovie }
}
