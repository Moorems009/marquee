'use client'

import { useState, useRef } from 'react'
import { Movie, Label, LabelItem } from '@/lib/types'

type Props = {
  label: Label
  orderedMovies: Movie[]
  onSave: (positions: LabelItem[], isSection: boolean) => Promise<void>
  onClose: () => void
}

export default function ManageLabelModal({ label, orderedMovies, onSave, onClose }: Props) {
  const [items, setItems] = useState<Movie[]>(orderedMovies)
  const [isSection, setIsSection] = useState(label.is_section)
  const [saving, setSaving] = useState(false)

  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  function handleDragStart(i: number) {
    dragIndex.current = i
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    setDragOverIndex(i)
  }

  function handleDrop(i: number) {
    const from = dragIndex.current
    if (from === null || from === i) {
      dragIndex.current = null
      setDragOverIndex(null)
      return
    }
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(i, 0, moved)
    setItems(next)
    dragIndex.current = null
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    dragIndex.current = null
    setDragOverIndex(null)
  }

  async function handleSave() {
    setSaving(true)
    const positions: LabelItem[] = items.map((m, i) => ({ itemId: m.id, position: i + 1 }))
    await onSave(positions, isSection)
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-navy/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-cream border border-powder-blue rounded p-8 w-full max-w-md mx-4 max-h-[85vh] flex flex-col"
      >
        <h2 className="mt-0 mb-1 text-[1.1rem] text-dusty-rose uppercase tracking-widest">
          {label.name}
        </h2>
        <p className="text-warm-gray text-xs mb-4">Drag items to set order within this label.</p>

        {/* Ordered list */}
        <div className="flex flex-col gap-1 overflow-y-auto flex-1 mb-5">
          {items.length === 0 ? (
            <p className="text-warm-gray italic text-sm">No items in this label yet.</p>
          ) : (
            items.map((movie, i) => (
              <div
                key={movie.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 px-3 py-2.5 bg-white border rounded cursor-grab select-none transition-colors ${
                  dragOverIndex === i
                    ? 'border-dusty-rose bg-cream'
                    : 'border-powder-blue'
                }`}
              >
                <span className="text-warm-gray text-sm shrink-0 w-4 text-center select-none">⠿</span>
                <span className="text-xs text-warm-gray shrink-0 w-5 text-right">{i + 1}.</span>
                {movie.poster_url && (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-6 h-9 object-cover rounded-sm shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-navy font-bold truncate">{movie.title}</div>
                  {movie.item_type === 'tv_season' && movie.season_number != null && (
                    <span className="text-xs text-warm-gray">S{movie.season_number}</span>
                  )}
                  {movie.year ? <span className="text-xs text-warm-gray ml-1">({movie.year})</span> : null}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Section toggle */}
        <div className="border-t border-powder-blue pt-4 mb-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsSection(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                isSection ? 'bg-mint' : 'bg-powder-blue'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  isSection ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
            <div>
              <div className="text-sm text-navy font-serif">Show as separate section</div>
              <div className="text-xs text-warm-gray">
                {isSection
                  ? 'This label will appear as a named block below the main shelf.'
                  : 'Items will appear grouped inline with the rest of the shelf.'}
              </div>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="bg-white text-warm-gray border border-powder-blue px-4 py-2 cursor-pointer font-serif rounded-sm text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-powder-blue text-navy border-none px-4 py-2 cursor-pointer font-serif rounded-sm text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
