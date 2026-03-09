'use client'

import { useState, useRef } from 'react'
import { Movie, Label, TMDBResult, TVShowResult } from '@/lib/types'
import { inputStyle, fieldLabelStyle } from '@/lib/styles'
import { searchMovies, getMovieCredits, getMovieRating, getMovieGenre, getPosterUrl, searchTVShows, getTVDetails } from '@/lib/tmdb'

type Props = {
  movie: Movie
  editData: Partial<Movie>
  editMovieLabels: Label[]
  labels: Label[]
  nowPlayingIds: string[]
  onClose: () => void
  onSave: (updates: Partial<Movie>, newLabelName: string) => Promise<void>
  onDelete: () => Promise<void>
  onSelectExistingLabel: (label: Label) => Promise<void>
  onRemoveLabel: (label: Label) => Promise<void>
  onToggleNowPlaying: (movieId: string) => void
  setEditData: (data: Partial<Movie>) => void
}

export default function EditMovieModal({
  movie,
  editData,
  editMovieLabels,
  labels,
  nowPlayingIds,
  onClose,
  onSave,
  onDelete,
  onSelectExistingLabel,
  onRemoveLabel,
  onToggleNowPlaying,
  setEditData
}: Props) {
  const [labelInput, setLabelInput] = useState('')
  const [labelSuggestions, setLabelSuggestions] = useState<Label[]>([])
  const [showLabelDropdown, setShowLabelDropdown] = useState(false)
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [showTmdbDropdown, setShowTmdbDropdown] = useState(false)
  const [tvResults, setTvResults] = useState<TVShowResult[]>([])
  const [showTvDropdown, setShowTvDropdown] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleLabelInput(value: string) {
    setLabelInput(value)
    if (value.trim().length === 0) {
      setLabelSuggestions([])
      setShowLabelDropdown(false)
      return
    }
    const filtered = labels.filter(
      (l) =>
        l.name.toLowerCase().includes(value.toLowerCase()) &&
        !editMovieLabels.find((el) => String(el.id) === String(l.id))
    )
    setLabelSuggestions(filtered)
    setShowLabelDropdown(filtered.length > 0)
  }

  function handleTitleChange(value: string) {
    setEditData({ ...editData, title: value })
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      if (value.length < 3) {
        setTmdbResults([]); setShowTmdbDropdown(false)
        setTvResults([]); setShowTvDropdown(false)
        return
      }
      if (movie.item_type === 'tv_season') {
        const results = await searchTVShows(value)
        setTvResults(results)
        setShowTvDropdown(true)
      } else {
        const results = await searchMovies(value)
        setTmdbResults(results)
        setShowTmdbDropdown(true)
      }
    }, 300)
  }

  async function handleSelectTMDB(result: TMDBResult) {
    setShowTmdbDropdown(false)
    setTmdbResults([])

    const updates: Partial<Movie> = {
      ...editData,
      title: result.title,
      year: result.release_date ? parseInt(result.release_date.split('-')[0]) : editData.year,
      poster_url: result.poster_path ? getPosterUrl(result.poster_path) : editData.poster_url
    }

    const [{ director }, { mpaa_rating }, { genre }] = await Promise.all([
      getMovieCredits(result.id),
      getMovieRating(result.id),
      getMovieGenre(result.id)
    ])
    if (director) updates.creator = director
    if (mpaa_rating !== undefined) updates.mpaa_rating = mpaa_rating
    if (genre !== undefined) updates.genre = genre

    setEditData(updates)
  }

  async function handleSelectTVShow(result: TVShowResult) {
    setShowTvDropdown(false)
    setTvResults([])

    const updates: Partial<Movie> = {
      ...editData,
      title: result.name,
      poster_url: result.poster_path ? getPosterUrl(result.poster_path) : editData.poster_url
    }

    const details = await getTVDetails(result.id)
    if (details.creator) updates.creator = details.creator
    if (details.genre) updates.genre = details.genre
    if (!result.poster_path && details.poster_path) updates.poster_url = getPosterUrl(details.poster_path)

    setEditData(updates)
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-[rgba(44,62,107,0.4)] flex items-center justify-center z-1000"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-cream border border-powder-blue rounded p-8 w-full max-w-125 mx-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="mt-0 mb-6 text-[1.1rem] text-dusty-rose uppercase tracking-widest">
          {movie.item_type === 'tv_season' ? 'Edit TV Season' : 'Edit Movie'}
        </h2>

        <div className="flex gap-4">
          {editData.poster_url && (
            <img
              src={editData.poster_url}
              alt={editData.title}
              className="w-20 h-30 object-cover rounded-sm shrink-0"
            />
          )}
          <div className="flex flex-col gap-4 flex-1">

            {/* Title with TMDB autocomplete */}
            <div className="relative">
              <label className={fieldLabelStyle}>Title</label>
              <input
                type="text"
                value={editData.title || ''}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setTimeout(() => { setShowTmdbDropdown(false); setShowTvDropdown(false) }, 150)}
                className={inputStyle}
              />
              {showTmdbDropdown && tmdbResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b z-200 shadow-md">
                  {tmdbResults.map((result) => (
                    <div
                      key={result.id}
                      onMouseDown={() => handleSelectTMDB(result)}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-powder-blue text-sm text-navy hover:bg-cream"
                    >
                      {result.poster_path && (
                        <img
                          src={getPosterUrl(result.poster_path, 'w92')}
                          alt={result.title}
                          className="w-8 h-12 object-cover rounded-sm"
                        />
                      )}
                      <div>
                        <span className="font-bold">{result.title}</span>
                        {result.release_date && (
                          <span className="text-warm-gray ml-2">
                            ({result.release_date.split('-')[0]})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showTvDropdown && tvResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b z-200 shadow-md">
                  {tvResults.map((result) => (
                    <div
                      key={result.id}
                      onMouseDown={() => handleSelectTVShow(result)}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-powder-blue text-sm text-navy hover:bg-cream"
                    >
                      {result.poster_path && (
                        <img
                          src={getPosterUrl(result.poster_path, 'w92')}
                          alt={result.name}
                          className="w-8 h-12 object-cover rounded-sm"
                        />
                      )}
                      <div>
                        <span className="font-bold">{result.name}</span>
                        {result.first_air_date && (
                          <span className="text-warm-gray ml-2">
                            ({result.first_air_date.split('-')[0]})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={fieldLabelStyle}>Director / Showrunner</label>
              <input
                type="text"
                value={editData.creator || ''}
                onChange={(e) => setEditData({ ...editData, creator: e.target.value })}
                className={inputStyle}
              />
            </div>
            {movie.item_type === 'tv_season' && (
              <div>
                <label className={fieldLabelStyle}>Season</label>
                <input
                  type="number"
                  min={1}
                  value={editData.season_number ?? ''}
                  onChange={(e) => setEditData({ ...editData, season_number: e.target.value ? parseInt(e.target.value) : null })}
                  className={inputStyle}
                />
              </div>
            )}
            <div>
              <label className={fieldLabelStyle}>Year</label>
              <input
                type="number"
                value={editData.year || ''}
                onChange={(e) => setEditData({ ...editData, year: parseInt(e.target.value) })}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={fieldLabelStyle}>Format</label>
              <select
                value={editData.format || 'Blu-ray'}
                onChange={(e) => setEditData({ ...editData, format: e.target.value })}
                className={inputStyle}
              >
                <option>Blu-ray</option>
                <option>4K</option>
                <option>DVD</option>
                <option>VHS</option>
                <option>Digital</option>
              </select>
            </div>
            <div>
              <label className={fieldLabelStyle}>Imprint</label>
              <input
                type="text"
                value={editData.imprint || ''}
                onChange={(e) => setEditData({ ...editData, imprint: e.target.value })}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={fieldLabelStyle}>MPAA Rating</label>
              <input
                type="text"
                placeholder="e.g. PG-13, R, NR"
                value={editData.mpaa_rating || ''}
                onChange={(e) => setEditData({ ...editData, mpaa_rating: e.target.value || null })}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={fieldLabelStyle}>Genre</label>
              <input
                type="text"
                placeholder="e.g. Drama, Thriller"
                value={editData.genre || ''}
                onChange={(e) => setEditData({ ...editData, genre: e.target.value || null })}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={fieldLabelStyle}>Labels</label>
              {editMovieLabels.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2 mt-1">
                  {editMovieLabels.map((label) => (
                    <span
                      key={label.id}
                      className="bg-butter text-navy px-2 py-0.5 rounded-full text-[0.8rem] flex items-center gap-1"
                    >
                      {label.name}
                      <button
                        onClick={() => onRemoveLabel(label)}
                        className="bg-transparent border-none cursor-pointer text-warm-gray p-0 text-[0.75rem] leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Add a label..."
                  value={labelInput}
                  onChange={(e) => handleLabelInput(e.target.value)}
                  onBlur={() => setTimeout(() => setShowLabelDropdown(false), 150)}
                  className={inputStyle}
                />
                {showLabelDropdown && labelSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b z-100 shadow-md">
                    {labelSuggestions.map((label) => (
                      <div
                        key={label.id}
                        onMouseDown={() => {
                          onSelectExistingLabel(label)
                          setLabelInput('')
                          setShowLabelDropdown(false)
                        }}
                        className="px-3 py-2 cursor-pointer text-sm text-navy border-b border-powder-blue hover:bg-cream"
                      >
                        {label.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[0.75rem] text-warm-gray mt-1 italic">
                Select an existing label or type a new one and click Save
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <div className="flex gap-2">
            <button
              onClick={onDelete}
              className="bg-white text-dusty-rose border border-dusty-rose px-4 py-2 cursor-pointer font-serif rounded-sm text-sm"
            >
              Delete
            </button>
            {(() => {
              const isNowPlaying = nowPlayingIds.includes(movie.id)
              const isFull = nowPlayingIds.length >= 3
              const disabled = !isNowPlaying && isFull
              return (
                <button
                  onClick={() => !disabled && onToggleNowPlaying(movie.id)}
                  className={`border px-4 py-2 font-serif rounded-sm text-sm ${
                    isNowPlaying
                      ? 'bg-white border-warm-gray text-warm-gray cursor-pointer'
                      : disabled
                      ? 'bg-white border-powder-blue text-powder-blue cursor-default opacity-50'
                      : 'bg-white border-mint text-navy cursor-pointer'
                  }`}
                  title={disabled ? 'Now Playing is full (3 max)' : undefined}
                >
                  {isNowPlaying ? 'Remove from Now Playing' : 'Now Playing'}
                </button>
              )
            })()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="bg-white text-warm-gray border border-warm-gray px-4 py-2 cursor-pointer font-serif rounded-sm text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(editData, labelInput)}
              className="bg-powder-blue text-navy border-none px-4 py-2 cursor-pointer font-serif rounded-sm text-sm font-bold"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
