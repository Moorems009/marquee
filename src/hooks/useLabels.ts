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

    if (!error && data) setLabels(data.map((l: Label) => ({ ...l, id: String(l.id) })))
  }

  async function fetchMovieLabels() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    const [{ data: mlData, error: mlError }, { data: lData, error: lError }] = await Promise.all([
      supabase.from('movie_labels').select('item_id, label_id'),
      supabase.from('labels').select('id, name').eq('user_id', user?.id)
    ])

    if (!mlError && !lError && mlData && lData && mlData.length > 0) {
      const labelById: Record<string, Label> = {}
      lData.forEach((l: Label) => { labelById[String(l.id)] = { ...l, id: String(l.id) } })

      const map: Record<string, Label[]> = {}
      mlData.forEach((row: { item_id: string; label_id: string }) => {
        const label = labelById[String(row.label_id)]
        if (label) {
          const key = String(row.item_id)
          if (!map[key]) map[key] = []
          map[key].push(label)
        }
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

  async function addLabelToMovie(movieId: string, label: Label) {
    const { error } = await supabase
      .from('movie_labels')
      .insert([{ item_id: movieId, label_id: label.id }])

    if (!error) {
      setMovieLabels(prev => {
        const current = prev[movieId] || []
        if (current.some(l => l.id === label.id)) return prev
        return { ...prev, [movieId]: [...current, label] }
      })
    }
    return { error }
  }

  async function removeLabelFromMovie(movieId: string, labelId: string) {
    const { error } = await supabase
      .from('movie_labels')
      .delete()
      .eq('item_id', movieId)
      .eq('label_id', labelId)

    if (!error) {
      setMovieLabels(prev => ({
        ...prev,
        [movieId]: (prev[movieId] || []).filter(l => l.id !== labelId)
      }))
    }
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
