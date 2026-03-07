import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Label } from '@/lib/types'

export function useLabels() {
  const supabase = createClient()
  const [labels, setLabels] = useState<Label[]>([])
  const [movieLabels, setMovieLabels] = useState<Record<string, Label[]>>({})

  async function fetchLabels() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('user_id', user?.id)
      .order('name', { ascending: true })

    if (!error && data) setLabels(data)
  }

  async function fetchMovieLabels() {
    const { data, error } = await supabase
      .from('movie_labels')
      .select('movie_id, labels(id, name)')

    if (!error && data) {
      const map: Record<string, Label[]> = {}
      data.forEach((row: { movie_id: string; labels: Label | Label[] }) => {
        if (!map[row.movie_id]) map[row.movie_id] = []
        const label = Array.isArray(row.labels) ? row.labels[0] : row.labels
        if (label) map[row.movie_id].push(label)
      })
      setMovieLabels(map)
    }
  }

  async function createLabel(name: string, userId: string) {
    const { data, error } = await supabase
      .from('labels')
      .insert([{ name, user_id: userId }])
      .select()
      .single()

    if (!error) await fetchLabels()
    return { data, error }
  }

  async function addLabelToMovie(movieId: string, labelId: string) {
    const { error } = await supabase
      .from('movie_labels')
      .insert([{ movie_id: movieId, label_id: labelId }])

    if (!error) await fetchMovieLabels()
    return { error }
  }

  async function removeLabelFromMovie(movieId: string, labelId: string) {
    const { error } = await supabase
      .from('movie_labels')
      .delete()
      .eq('movie_id', movieId)
      .eq('label_id', labelId)

    if (!error) await fetchMovieLabels()
    return { error }
  }

  return {
    labels,
    movieLabels,
    fetchLabels,
    fetchMovieLabels,
    createLabel,
    addLabelToMovie,
    removeLabelFromMovie
  }
}