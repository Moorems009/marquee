'use client'

import { useState, useRef } from 'react'
import { searchMovies, searchCollection, getCollectionParts, getPosterUrl } from '@/lib/tmdb'
import type { CollectionPart, ImportRow } from './ImportCSVModal'

type Props = {
  row: ImportRow
  parts: CollectionPart[]
  onPartsChange: (parts: CollectionPart[]) => void
  onKeepAsIs: () => void
}

export default function CollectionReviewCard({ row, parts, onPartsChange, onKeepAsIs }: Props) {
  const [filmSearch, setFilmSearch] = useState('')
  const [filmResults, setFilmResults] = useState<Array<{ id: number; title: string; release_date: string; poster_path?: string }>>([])
  const [filmSearching, setFilmSearching] = useState(false)
  const filmSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [colSearch, setColSearch] = useState('')
  const [colResults, setColResults] = useState<Array<{ id: number; name: string; poster_path: string | null }>>([])
  const [colSearching, setColSearching] = useState(false)
  const [colLoadingId, setColLoadingId] = useState<number | null>(null)
  const colSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleFilmSearch(value: string) {
    setFilmSearch(value)
    if (filmSearchTimeout.current) clearTimeout(filmSearchTimeout.current)
    if (value.length < 2) { setFilmResults([]); return }
    filmSearchTimeout.current = setTimeout(async () => {
      setFilmSearching(true)
      const results = await searchMovies(value)
      setFilmResults(results.slice(0, 5))
      setFilmSearching(false)
    }, 300)
  }

  function handleAddFilm(result: { id: number; title: string; release_date: string; poster_path?: string }) {
    if (parts.some(p => p.id === result.id)) return
    onPartsChange([...parts, result])
    setFilmSearch('')
    setFilmResults([])
  }

  function handleColSearch(value: string) {
    setColSearch(value)
    if (colSearchTimeout.current) clearTimeout(colSearchTimeout.current)
    if (value.length < 2) { setColResults([]); return }
    colSearchTimeout.current = setTimeout(async () => {
      setColSearching(true)
      const results = await searchCollection(value)
      setColResults(results.slice(0, 5))
      setColSearching(false)
    }, 300)
  }

  async function handleReplaceWithCollection(collectionId: number) {
    setColResults([])
    setColSearch('')
    setColLoadingId(collectionId)
    const newParts = await getCollectionParts(collectionId)
    onPartsChange(newParts)
    setColLoadingId(null)
  }

  return (
    <div className="border-b border-powder-blue last:border-b-0 pb-3 last:pb-0">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-navy text-[0.8rem] font-bold">{row.row.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          {parts.length > 0 && (
            <button
              onClick={() => onPartsChange([])}
              className="bg-white text-dusty-rose border border-dusty-rose px-3 py-1 cursor-pointer font-serif rounded-sm text-[0.75rem]"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onKeepAsIs}
            className="bg-white text-warm-gray border border-warm-gray px-3 py-1 cursor-pointer font-serif rounded-sm text-[0.75rem]"
          >
            Keep as single entry
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 mb-1.5">
        {parts.map((part, idx) => (
          <div key={idx} className="flex items-center gap-2 py-0.5">
            {part.poster_path && (
              <img src={getPosterUrl(part.poster_path, 'w92')} alt={part.title} className="w-5 h-7 object-cover rounded-sm shrink-0" />
            )}
            <span className="text-navy text-[0.75rem] flex-1">
              {part.title}
              {part.release_date && <span className="text-warm-gray ml-1">({part.release_date.split('-')[0]})</span>}
            </span>
            <button
              onClick={() => onPartsChange(parts.filter((_, i) => i !== idx))}
              className="text-warm-gray hover:text-dusty-rose bg-transparent border-none cursor-pointer font-serif text-[0.75rem] shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
        {parts.length === 0 && (
          <p className="text-warm-gray text-[0.72rem] italic m-0">All films removed — will be kept as a single entry</p>
        )}
      </div>

      {/* Replace with a different TMDB collection */}
      <div className="relative mb-1.5">
        <input
          type="text"
          placeholder="Replace with a different TMDB collection…"
          value={colSearch}
          onChange={(e) => handleColSearch(e.target.value)}
          onBlur={() => setTimeout(() => setColResults([]), 150)}
          className="w-full border border-powder-blue rounded-sm px-3 py-1.5 font-serif text-[0.8rem] text-navy bg-white outline-none"
        />
        {(colSearching || colLoadingId !== null) && (
          <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b px-3 py-2 text-[0.75rem] text-warm-gray italic">
            {colLoadingId !== null ? 'Loading collection…' : 'Searching…'}
          </div>
        )}
        {!colSearching && colLoadingId === null && colResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b z-10 shadow-md">
            {colResults.map(result => (
              <div
                key={result.id}
                onMouseDown={() => handleReplaceWithCollection(result.id)}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer text-[0.8rem] text-navy hover:bg-cream border-b border-powder-blue last:border-b-0"
              >
                {result.poster_path && (
                  <img src={getPosterUrl(result.poster_path, 'w92')} alt={result.name} className="w-6 h-9 object-cover rounded-sm shrink-0" />
                )}
                <span className="flex-1">{result.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add individual films */}
      <div className="relative">
        <input
          type="text"
          placeholder="Add an individual film…"
          value={filmSearch}
          onChange={(e) => handleFilmSearch(e.target.value)}
          onBlur={() => setTimeout(() => setFilmResults([]), 150)}
          className="w-full border border-powder-blue rounded-sm px-3 py-1.5 font-serif text-[0.8rem] text-navy bg-white outline-none"
        />
        {filmSearching && (
          <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b px-3 py-2 text-[0.75rem] text-warm-gray italic">
            Searching…
          </div>
        )}
        {!filmSearching && filmResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b z-10 shadow-md">
            {filmResults.map(result => (
              <div
                key={result.id}
                onMouseDown={() => handleAddFilm(result)}
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
    </div>
  )
}
