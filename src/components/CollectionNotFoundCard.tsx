'use client'

import { useState, useRef } from 'react'
import { searchMovies, getPosterUrl } from '@/lib/tmdb'
import type { CollectionPart, ImportRow } from './ImportCSVModal'

type Props = {
  row: ImportRow
  useCollectionLabel: boolean
  onKeepAsIs: () => void
  onConfirm: (parts: CollectionPart[]) => void
}

export default function CollectionNotFoundCard({ row, useCollectionLabel, onKeepAsIs, onConfirm }: Props) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Array<{ id: number; title: string; release_date: string; poster_path?: string }>>([])
  const [searching, setSearching] = useState(false)
  const [parts, setParts] = useState<CollectionPart[]>([])
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearch(value: string) {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.length < 2) { setResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const res = await searchMovies(value)
      setResults(res.slice(0, 5))
      setSearching(false)
    }, 300)
  }

  function handleAdd(result: { id: number; title: string; release_date: string; poster_path?: string }) {
    if (parts.some(p => p.id === result.id)) return
    setParts(prev => [...prev, result])
    setSearch('')
    setResults([])
  }

  return (
    <div className="border-b border-powder-blue last:border-b-0 pb-4 last:pb-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-navy text-[0.8rem] font-bold">{row.row.title}</span>
        <button
          onClick={onKeepAsIs}
          className="bg-white text-warm-gray border border-warm-gray px-3 py-1 cursor-pointer font-serif rounded-sm text-[0.75rem] shrink-0"
        >
          Keep as single entry
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search for a film to add…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          onBlur={() => setTimeout(() => setResults([]), 150)}
          className="w-full border border-powder-blue rounded-sm px-3 py-1.5 font-serif text-[0.8rem] text-navy bg-white outline-none"
        />
        {searching && (
          <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b px-3 py-2 text-[0.75rem] text-warm-gray italic">
            Searching…
          </div>
        )}
        {!searching && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b z-10 shadow-md">
            {results.map(result => (
              <div
                key={result.id}
                onMouseDown={() => handleAdd(result)}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer text-[0.8rem] text-navy hover:bg-cream border-b border-powder-blue last:border-b-0"
              >
                {result.poster_path && (
                  <img src={getPosterUrl(result.poster_path, 'w92')} alt={result.title} className="w-6 h-9 object-cover rounded-sm shrink-0" />
                )}
                <span className="flex-1">{result.title}</span>
                {result.release_date && <span className="text-warm-gray">({result.release_date.split('-')[0]})</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {parts.length > 0 && (
        <div className="mt-2">
          {parts.map((part, idx) => (
            <div key={idx} className="flex items-center justify-between py-0.5 text-[0.75rem]">
              <span className="text-navy">
                {part.title}
                {part.release_date && <span className="text-warm-gray ml-1">({part.release_date.split('-')[0]})</span>}
              </span>
              <button
                onClick={() => setParts(prev => prev.filter((_, i) => i !== idx))}
                className="text-warm-gray hover:text-dusty-rose bg-transparent border-none cursor-pointer ml-2 font-serif text-[0.75rem]"
              >
                ✕
              </button>
            </div>
          ))}
          {useCollectionLabel && (
            <p className="text-warm-gray text-[0.72rem] italic mt-1 mb-1">
              &ldquo;{row.collectionLabel}&rdquo; will be applied as a label to each film.
            </p>
          )}
          <button
            onClick={() => onConfirm(parts)}
            className="mt-1 bg-powder-blue text-navy border-none px-3 py-1 cursor-pointer font-serif rounded-sm text-[0.75rem] font-bold"
          >
            Expand into {parts.length} film{parts.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}
