'use client'

import { useState } from 'react'
import { Movie, Label } from '@/lib/types'
import { sectionHeadingStyle, inputStyle } from '@/lib/styles'
import AddMovieForm from './AddMovieForm'
import ErrorBoundary from './ErrorBoundary'

type SortKey = 'title-asc' | 'title-desc' | 'year-desc' | 'year-asc' | 'director' | 'format' | 'genre' | 'rating'

type Props = {
  movies: Movie[]
  labels: Label[]
  loading: boolean
  viewMode: 'list' | 'grid'
  movieLabels: Record<string, Label[]>
  onEdit: (movie: Movie) => void
  onViewModeChange: (mode: 'list' | 'grid') => void
  onShuffle: () => void
  onMovieAdded: () => void
}

export default function MovieList({
  movies,
  labels,
  loading,
  viewMode,
  movieLabels,
  onEdit,
  onViewModeChange,
  onShuffle,
  onMovieAdded
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterFormat, setFilterFormat] = useState('')
  const [filterLabel, setFilterLabel] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('title-asc')
  const [showFilters, setShowFilters] = useState(false)

  const activeFilterCount = [search.trim(), filterFormat, filterLabel].filter(Boolean).length

  const filteredMovies = movies.filter((movie) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!movie.title.toLowerCase().includes(q) && !(movie.director?.toLowerCase().includes(q))) return false
    }
    if (filterFormat && movie.format !== filterFormat) return false
    if (filterLabel) {
      const ids = (movieLabels[String(movie.id)] || []).map((l) => String(l.id))
      if (!ids.includes(filterLabel)) return false
    }
    return true
  })

  const sortedMovies = [...filteredMovies].sort((a, b) => {
    switch (sortBy) {
      case 'title-asc':  return a.title.localeCompare(b.title)
      case 'title-desc': return b.title.localeCompare(a.title)
      case 'year-desc':  return (b.year || 0) - (a.year || 0)
      case 'year-asc':   return (a.year || 0) - (b.year || 0)
      case 'director': {
        const lastName = (d: string | null | undefined) => d ? (d.split(' ').pop() || d) : 'ZZZZ'
        return lastName(a.director).localeCompare(lastName(b.director))
      }
      case 'format':     return a.format.localeCompare(b.format)
      case 'genre':      return (a.genre || '').localeCompare(b.genre || '')
      case 'rating':     return (a.mpaa_rating || 'ZZ').localeCompare(b.mpaa_rating || 'ZZ')
      default:           return 0
    }
  })

  const selectClass = 'py-2 px-3 border border-powder-blue rounded-sm font-serif bg-cream text-navy text-sm'

  const viewBtnClass = (active: boolean) =>
    `border border-powder-blue text-navy py-1 px-3 cursor-pointer font-serif rounded-sm text-[0.8rem] ${active ? 'bg-powder-blue' : 'bg-white'}`

  const filterBtnClass = showFilters
    ? 'border border-powder-blue bg-powder-blue text-navy py-1 px-3 cursor-pointer font-serif rounded-sm text-[0.8rem]'
    : activeFilterCount > 0
      ? 'border border-dusty-rose text-dusty-rose bg-white py-1 px-3 cursor-pointer font-serif rounded-sm text-[0.8rem]'
      : 'border border-powder-blue text-warm-gray bg-white py-1 px-3 cursor-pointer font-serif rounded-sm text-[0.8rem]'

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className={sectionHeadingStyle}>My Shelf</h2>
        <div className="flex gap-2">
          {!loading && movies.length > 0 && (
            <button onClick={() => setShowFilters((v) => !v)} className={filterBtnClass}>
              {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
            </button>
          )}
          <button onClick={() => onViewModeChange('list')} className={viewBtnClass(viewMode === 'list')}>
            ☰ List
          </button>
          <button onClick={() => onViewModeChange('grid')} className={viewBtnClass(viewMode === 'grid')}>
            ⊞ Grid
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-2 bg-transparent border border-powder-blue text-navy px-4 py-1.5 cursor-pointer font-serif text-sm rounded-sm"
        >
          <span>{showAddForm ? '−' : '+'}</span> Add a movie
        </button>
        {!loading && movies.length > 0 && (
          <button
            onClick={onShuffle}
            className="bg-transparent border border-powder-blue text-warm-gray px-3 py-1.5 cursor-pointer font-serif text-sm rounded-sm"
          >
            ↺ Shuffle Now Playing
          </button>
        )}
      </div>
      {showAddForm && (
        <div className="mb-6">
          <ErrorBoundary>
            <AddMovieForm
              movies={movies}
              onMovieAdded={() => {
                onMovieAdded()
                setShowAddForm(true)
              }}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Collapsible filter + sort bar */}
      {showFilters && !loading && movies.length > 0 && (
        <div className="border border-powder-blue rounded bg-white p-3 mb-4 flex flex-col gap-2">
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              type="text"
              placeholder="Search title or director…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputStyle} flex-1 min-w-0`}
            />
            <select value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)} className={selectClass}>
              <option value="">All formats</option>
              <option>4K</option>
              <option>Blu-ray</option>
              <option>DVD</option>
              <option>VHS</option>
              <option>Digital</option>
            </select>
            {labels.length > 0 && (
              <select value={filterLabel} onChange={(e) => setFilterLabel(e.target.value)} className={selectClass}>
                <option value="">All labels</option>
                {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-warm-gray uppercase tracking-wider">Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className={selectClass}>
                <option value="title-asc">Title A→Z</option>
                <option value="title-desc">Title Z→A</option>
                <option value="year-desc">Year (newest)</option>
                <option value="year-asc">Year (oldest)</option>
                <option value="director">Director A→Z</option>
                <option value="format">Format A→Z</option>
                <option value="genre">Genre A→Z</option>
                <option value="rating">Rating A→Z</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setSearch(''); setFilterFormat(''); setFilterLabel('') }}
                className="text-sm text-warm-gray bg-transparent border-none cursor-pointer font-serif underline whitespace-nowrap"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        viewMode === 'list' ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-3 px-4 bg-white border border-powder-blue border-l-4 border-l-blush rounded animate-pulse"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-12 bg-powder-blue/40 rounded-sm shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="h-4 bg-powder-blue/40 rounded w-2/5" />
                    <div className="h-3 bg-powder-blue/30 rounded w-1/4" />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <div className="h-5 w-12 bg-mint/40 rounded-sm" />
                  <div className="h-5 w-8 bg-powder-blue/30 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded overflow-hidden border border-powder-blue bg-white animate-pulse"
              >
                <div className="w-full bg-powder-blue/30" style={{ aspectRatio: '2/3' }} />
                <div className="p-2 flex flex-col gap-1.5">
                  <div className="h-3 bg-powder-blue/40 rounded w-3/4" />
                  <div className="h-3 bg-mint/40 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : movies.length === 0 ? (
        <p className="text-warm-gray italic">No movies yet. Add some!</p>
      ) : sortedMovies.length === 0 ? (
        <p className="text-warm-gray italic">No movies match your filters.</p>
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-2">
          {sortedMovies.map((movie) => (
            <div
              key={movie.id}
              className="flex justify-between items-center py-3 px-4 bg-white border border-powder-blue border-l-4 border-l-blush rounded"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {movie.poster_url && (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-8 h-12 object-cover rounded-sm shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <span className="font-bold text-navy">{movie.title}</span>
                  <span className="text-warm-gray ml-2 text-sm">({movie.year})</span>
                  {movie.director && (
                    <span className="text-warm-gray ml-2 text-sm">— {movie.director}</span>
                  )}
                  {movie.genre && (
                    <div className="text-xs text-warm-gray italic mt-0.5">{movie.genre}</div>
                  )}
                  {movieLabels[movie.id]?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {movieLabels[movie.id].map((label) => (
                        <span
                          key={label.id}
                          className="bg-butter text-navy px-2 py-0.5 rounded-full text-[0.7rem] font-serif"
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3 flex-wrap justify-end">
                <span className="text-xs uppercase tracking-wide text-white bg-mint px-2 py-0.5 rounded-sm whitespace-nowrap">
                  {movie.format}
                </span>
                {movie.imprint && (
                  <span className="text-xs italic text-navy bg-powder-blue px-2 py-0.5 rounded-sm whitespace-nowrap">
                    {movie.imprint}
                  </span>
                )}
                {movie.mpaa_rating && (
                  <span className="text-xs text-navy border border-warm-gray px-2 py-0.5 rounded-sm whitespace-nowrap font-serif">
                    {movie.mpaa_rating}
                  </span>
                )}
                <button
                  onClick={() => onEdit(movie)}
                  className="bg-transparent border border-powder-blue text-warm-gray px-2 py-0.5 cursor-pointer font-serif rounded-sm text-xs"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {sortedMovies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => onEdit(movie)}
              className="cursor-pointer rounded overflow-hidden border border-powder-blue bg-white transition-transform duration-100 hover:scale-[1.03]"
            >
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full object-cover block"
                  style={{ aspectRatio: '2/3' }}
                />
              ) : (
                <div
                  className="w-full bg-cream flex items-center justify-center p-2 text-center"
                  style={{ aspectRatio: '2/3' }}
                >
                  <span className="text-[0.8rem] text-warm-gray italic">{movie.title}</span>
                </div>
              )}
              <div className="p-2">
                <div className="text-[0.75rem] font-bold text-navy mb-0.5">{movie.title}</div>
                <span className="text-[0.65rem] uppercase text-white bg-mint px-1.5 py-0.5 rounded-sm inline-block">
                  {movie.format}
                </span>
                {movie.imprint && (
                  <span className="text-[0.65rem] italic text-navy bg-powder-blue px-1.5 py-0.5 rounded-sm inline-block ml-1">
                    {movie.imprint}
                  </span>
                )}
                {movie.mpaa_rating && (
                  <span className="text-[0.65rem] text-navy border border-warm-gray px-1.5 py-0.5 rounded-sm inline-block ml-1 font-serif">
                    {movie.mpaa_rating}
                  </span>
                )}
                {movie.genre && (
                  <div className="text-[0.65rem] text-warm-gray italic mt-1">{movie.genre}</div>
                )}
                {movieLabels[movie.id]?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {movieLabels[movie.id].map((label) => (
                      <span
                        key={label.id}
                        className="bg-butter text-navy px-1.5 py-0.5 rounded-full text-[0.6rem]"
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
