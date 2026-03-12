import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Label, LabelItem } from '@/lib/types'

export function useLabels() {
  const supabase = createClient()
  const [labels, setLabels] = useState<Label[]>([])
  const [movieLabels, setMovieLabels] = useState<Record<string, Label[]>>({})
  // label_id → items in position order (position 0 = unordered, sorts to end)
  const [labelItems, setLabelItems] = useState<Record<string, LabelItem[]>>({})

  async function fetchLabels() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    const { data, error } = await supabase
      .from('labels')
      .select('id, name, is_section')
      .eq('user_id', user?.id)
      .order('name', { ascending: true })

    if (!error && data) setLabels(data.map((l: Label) => ({ ...l, id: String(l.id), is_section: l.is_section ?? false })))
  }

  async function fetchMovieLabels() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    const [{ data: mlData, error: mlError }, { data: lData, error: lError }] = await Promise.all([
      supabase.from('movie_labels').select('item_id, label_id, position, created_at').order('created_at', { ascending: true }),
      supabase.from('labels').select('id, name, is_section').eq('user_id', user?.id)
    ])

    if (!mlError && !lError && mlData && lData) {
      const labelById: Record<string, Label> = {}
      lData.forEach((l: Label) => { labelById[String(l.id)] = { ...l, id: String(l.id), is_section: l.is_section ?? false } })

      // item_id → labels ordered by created_at (first assigned = primary)
      const itemMap: Record<string, Label[]> = {}
      // label_id → items
      const labelMap: Record<string, LabelItem[]> = {}

      mlData.forEach((row: { item_id: string; label_id: string; position: number; created_at: string }) => {
        const label = labelById[String(row.label_id)]
        if (label) {
          const itemKey = String(row.item_id)
          if (!itemMap[itemKey]) itemMap[itemKey] = []
          itemMap[itemKey].push(label)
        }

        const labelKey = String(row.label_id)
        if (!labelMap[labelKey]) labelMap[labelKey] = []
        labelMap[labelKey].push({ itemId: String(row.item_id), position: row.position || 0 })
      })

      // Sort each label's items: explicit positions (>0) ascending, then unordered (0) in insertion order
      Object.keys(labelMap).forEach(labelId => {
        labelMap[labelId].sort((a, b) => {
          if (a.position === 0 && b.position === 0) return 0
          if (a.position === 0) return 1
          if (b.position === 0) return -1
          return a.position - b.position
        })
      })

      if (mlData.length > 0) setMovieLabels(itemMap)
      setLabelItems(labelMap)
    }
  }

  async function createLabel(name: string, userId: string) {
    const { data, error } = await supabase
      .from('labels')
      .insert([{ name, user_id: userId, is_section: false }])
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
      setLabelItems(prev => {
        const current = prev[label.id] || []
        if (current.some(li => li.itemId === movieId)) return prev
        return { ...prev, [label.id]: [...current, { itemId: movieId, position: 0 }] }
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
      setLabelItems(prev => ({
        ...prev,
        [labelId]: (prev[labelId] || []).filter(li => li.itemId !== movieId)
      }))
    }
    return { error }
  }

  // Batch-update positions for all items in a label after drag-to-reorder
  async function updateLabelItemPositions(labelId: string, positions: LabelItem[]) {
    const updates = positions.map(({ itemId, position }) =>
      supabase
        .from('movie_labels')
        .update({ position })
        .eq('label_id', labelId)
        .eq('item_id', itemId)
    )
    await Promise.all(updates)

    setLabelItems(prev => ({
      ...prev,
      [labelId]: [...positions].sort((a, b) => {
        if (a.position === 0 && b.position === 0) return 0
        if (a.position === 0) return 1
        if (b.position === 0) return -1
        return a.position - b.position
      })
    }))
  }

  // Toggle whether a label renders as a separate section
  async function updateLabelSection(labelId: string, isSection: boolean) {
    const { error } = await supabase
      .from('labels')
      .update({ is_section: isSection })
      .eq('id', labelId)

    if (!error) {
      setLabels(prev => prev.map(l => l.id === labelId ? { ...l, is_section: isSection } : l))
    }
    return { error }
  }

  return {
    labels,
    movieLabels,
    labelItems,
    fetchLabels,
    fetchMovieLabels,
    createLabel,
    addLabelToMovie,
    removeLabelFromMovie,
    updateLabelItemPositions,
    updateLabelSection,
  }
}
