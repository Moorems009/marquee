'use client'

import { useState } from 'react'
import { Movie, Label, LabelItem } from '@/lib/types'
import { sectionHeadingStyle, inputStyle } from '@/lib/styles'
import AddMovieForm from './AddMovieForm'
import ErrorBoundary from './ErrorBoundary'

type SortKey = 'title-asc' | 'title-desc' | 'year-desc' | 'year-asc' | 'director-asc' | 'director-desc'

type Props = {
  movies: Movie[]
  labels: Label[]
  loading: boolean
  viewMode: 'list' | 'grid'
  movieLabels: Record<string, Label[]>
  labelItems: Record<string, LabelItem[]>
  onEdit: (movie: Movie) => void
  onViewModeChange: (mode: 'list' | 'grid') => void
  onShuffle: (ids: string[]) => void
  onMovieAdded: (newId: string) => void
  onManageLabel: (labelId: string) => void
}

export default function MovieList({
  movies,
  labels,
  loading,
  viewMode,
  movieLabels,
  labelItems,
  onEdit,
  onViewModeChange,
  onShuffle,
  onMovieAdded,
  onManageLabel,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterFormat, setFilterFormat] = useState('')
  const [filterLabel, setFilterLabel] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [ratingMode, setRatingMode] = useState<'exact' | 'lower'>('exact')
  const [includeNR, setIncludeNR] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>('title-asc')
  const [showFilters, setShowFilters] = useState(false)

  const RATING_ORDER = ['G', 'PG', 'PG-13', 'R', 'NC-17']

  const activeFilterCount = [search.trim(), filterType, filterFormat, filterLabel, filterGenre, filterRegion, filterRating].filter(Boolean).length + (!includeNR ? 1 : 0)

  const allGenres = [...new Set(
    movies.flatMap(m => m.genre ? m.genre.split(',').map(g => g.trim()) : [])
  )].sort()

  const allRegions = [...new Set(movies.map(m => m.region).filter(Boolean) as string[])].sort()

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredMovies = movies.filter((movie) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!movie.title.toLowerCase().includes(q) && !(movie.creator?.toLowerCase().includes(q))) return false
    }
    if (filterType === 'movie' && movie.item_type !== 'movie') return false
    if (filterType === 'tv' && movie.item_type !== 'tv_season') return false
    if (filterFormat && movie.format !== filterFormat) return false
    if (filterLabel) {
      const ids = (movieLabels[String(movie.id)] || []).map((l) => String(l.id))
      if (!ids.includes(filterLabel)) return false
    }
    if (filterGenre) {
      const genres = movie.genre ? movie.genre.split(',').map(g => g.trim()) : []
      if (!genres.includes(filterGenre)) return false
    }
    if (filterRegion && movie.region !== filterRegion) return false
    if (filterRating || !includeNR) {
      const rating = movie.mpaa_rating?.trim() || ''
      const isNR = !rating || rating.toUpperCase() === 'NR'
      if (isNR) {
        if (!includeNR) return false
      } else if (filterRating) {
        if (ratingMode === 'exact') {
          if (rating !== filterRating) return false
        } else {
          const movieIdx = RATING_ORDER.indexOf(rating)
          const filterIdx = RATING_ORDER.indexOf(filterRating)
          if (movieIdx < 0 || movieIdx >= filterIdx) return false
        }
      }
    }
    return true
  })

  const sortTitle = (t: string) => t.replace(/^(the|a|an)\s+/i, '')

  // ── Sort comparator ─────────────────────────────────────────────────────────
  function compareMovies(a: Movie, b: Movie, key: SortKey): number {
    switch (key) {
      case 'title-asc':  return sortTitle(a.title).localeCompare(sortTitle(b.title))
      case 'title-desc': return sortTitle(b.title).localeCompare(sortTitle(a.title))
      case 'year-desc':  return (b.year || 0) - (a.year || 0)
      case 'year-asc':   return (a.year || 0) - (b.year || 0)
      case 'director-asc':
      case 'director-desc': {
        const lastName = (d: string | null | undefined) => d ? (d.split(' ').pop() || d) : 'ZZZZ'
        const cmp = lastName(a.creator).localeCompare(lastName(b.creator))
        return key === 'director-desc' ? -cmp : cmp
      }
      default:        return 0
    }
  }

  // ── Build display list (main + sections) ────────────────────────────────────
  function buildDisplayList(): { mainItems: Movie[]; sectionBlocks: { label: Label; items: Movie[] }[] } {
    // When filtering by a specific label, just show in that label's position order
    if (filterLabel) {
      const entries = labelItems[filterLabel] || []
      const ordered: Movie[] = []
      entries.forEach(entry => {
        const m = filteredMovies.find(fm => fm.id === entry.itemId)
        if (m) ordered.push(m)
      })
      // Any filtered items not yet assigned a position go at the end
      filteredMovies.forEach(m => {
        if (!ordered.find(o => o.id === m.id)) ordered.push(m)
      })
      return { mainItems: ordered, sectionBlocks: [] }
    }

    // Section labels: items pulled entirely out of the main list
    const sectionLabels = labels.filter(l => l.is_section)
    const sectionItemIds = new Set(
      sectionLabels.flatMap(l => (labelItems[l.id] || []).map(li => li.itemId))
    )

    // Items available for main list
    const mainPool = filteredMovies.filter(m => !sectionItemIds.has(m.id))

    // Determine if an inline label's group should be maintained under the current sort
    function allSame(items: Movie[], key: (m: Movie) => string | null | undefined): boolean {
      if (items.length < 2) return false
      const first = key(items[0])
      return items.every(m => key(m) === first)
    }

    function shouldGroup(labelId: string): boolean {
      const items = (labelItems[labelId] || [])
        .map(li => mainPool.find(m => m.id === li.itemId))
        .filter(Boolean) as Movie[]
      if (items.length < 2) return false
      switch (sortBy) {
        case 'title-asc':
        case 'title-desc':  return true
        case 'year-asc':
        case 'year-desc':   return false
        case 'director-asc':
        case 'director-desc': return allSame(items, m => m.creator)
        default:            return false
      }
    }

    // Get anchor sort key for a group
    function getAnchorKey(label: Label, items: Movie[]): string {
      switch (sortBy) {
        case 'title-asc':
        case 'title-desc':  return sortTitle(label.name)
        case 'director-asc':
        case 'director-desc': {
          const c = items[0]?.creator || ''
          return c.split(' ').pop() || c
        }
        default:        return sortTitle(label.name)
      }
    }

    // Inline labels: not section, has members in main pool
    const inlineLabels = labels.filter(l => !l.is_section)

    // Items that are grouped under an inline label are determined by their primary label.
    // Primary label = first label assigned (movieLabels[id][0]).
    // An item is included in inline group L only if L is its primary label.
    const groupedItemIds = new Set<string>()
    const activeGroups: { label: Label; items: Movie[]; anchorKey: string }[] = []

    for (const label of inlineLabels) {
      if (!shouldGroup(label.id)) continue

      const groupItems = (labelItems[label.id] || [])
        .map(li => mainPool.find(m => m.id === li.itemId))
        .filter((m): m is Movie => !!m)
        // Only include items whose primary label is this one
        .filter(m => {
          const primary = movieLabels[m.id]?.[0]
          return primary && primary.id === label.id
        })

      if (groupItems.length < 2) continue

      groupItems.forEach(m => groupedItemIds.add(m.id))
      activeGroups.push({ label, items: groupItems, anchorKey: getAnchorKey(label, groupItems) })
    }

    // Individual items: main pool, not in any active inline group
    const individualItems = mainPool.filter(m => !groupedItemIds.has(m.id))
    const sortedIndividual = [...individualItems].sort((a, b) => compareMovies(a, b, sortBy))

    // Merge inline groups into sorted individual list at their anchor positions
    let displayItems = [...sortedIndividual]

    // Sort groups by anchor key to process in consistent order
    const sortedGroups = [...activeGroups].sort((a, b) => {
      if (sortBy === 'title-desc') return b.anchorKey.localeCompare(a.anchorKey)
      return a.anchorKey.localeCompare(b.anchorKey)
    })

    for (const group of sortedGroups) {
      // Find insertion index: first item whose anchor key is >= group's anchor key
      let insertIdx = displayItems.length
      for (let i = 0; i < displayItems.length; i++) {
        const itemKey = getAnchorKey(group.label, [displayItems[i]])
        const cmp = sortBy === 'title-desc'
          ? group.anchorKey.localeCompare(itemKey)
          : itemKey.localeCompare(group.anchorKey)
        if (cmp <= 0) {
          insertIdx = i
          break
        }
      }
      displayItems.splice(insertIdx, 0, ...group.items)
    }

    // Build section blocks (always in label position order)
    const sectionBlocks = sectionLabels
      .map(label => {
        const items = (labelItems[label.id] || [])
          .map(li => filteredMovies.find(m => m.id === li.itemId))
          .filter((m): m is Movie => !!m)
        return { label, items }
      })
      .filter(b => b.items.length > 0)

    return { mainItems: displayItems, sectionBlocks }
  }

  const { mainItems, sectionBlocks } = buildDisplayList()
  const totalDisplayCount = mainItems.length + sectionBlocks.reduce((s, b) => s + b.items.length, 0)

  // ── Shared render helpers ───────────────────────────────────────────────────
  const selectClass = 'py-2 px-3 border border-powder-blue rounded-sm font-serif bg-cream text-navy text-sm'

  const viewBtnClass = (active: boolean) =>
    `border border-powder-blue text-navy py-1 px-3 cursor-pointer font-serif rounded-sm text-[0.8rem] ${active ? 'bg-powder-blue' : 'bg-white'}`

  const filterBtnClass = showFilters
    ? 'border border-powder-blue bg-powder-blue text-navy py-1 px-3 cursor-pointer font-serif rounded-sm text-[0.8rem]'
    : activeFilterCount > 0
      ? 'border border-dusty-rose text-dusty-rose bg-white py-1 px-3 cursor-pointer font-serif rounded-sm text-[0.8rem]'
      : 'border border-powder-blue text-warm-gray bg-white py-1 px-3 cursor-pointer font-serif rounded-sm text-[0.8rem]'

  function renderListRow(movie: Movie) {
    return (
      <div
        key={movie.id}
        className="flex justify-between items-center py-3 px-4 bg-white border border-powder-blue border-l-4 border-l-blush rounded"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {movie.poster_url && (
            <img src={movie.poster_url} alt={movie.title} className="w-8 h-12 object-cover rounded-sm shrink-0" />
          )}
          <div className="min-w-0">
            <span className="font-bold text-navy">{movie.title}</span>
            {movie.item_type === 'tv_season' && movie.season_number != null && (
              <span className="text-warm-gray ml-1.5 text-sm">S{movie.season_number}</span>
            )}
            <span className="text-warm-gray ml-2 text-sm">({movie.year})</span>
            {movie.creator && <span className="text-warm-gray ml-2 text-sm">— {movie.creator}</span>}
            {movie.genre && <div className="text-xs text-warm-gray italic mt-0.5">{movie.genre}</div>}
            {movieLabels[movie.id]?.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {movieLabels[movie.id].map((label) => (
                  <span key={label.id} className="bg-butter text-navy px-2 py-0.5 rounded-full text-[0.7rem] font-serif">
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
    )
  }

  function renderGridCard(movie: Movie) {
    return (
      <div
        key={movie.id}
        onClick={() => onEdit(movie)}
        className="cursor-pointer rounded overflow-hidden border border-powder-blue bg-white transition-transform duration-100 hover:scale-[1.03]"
      >
        {movie.poster_url ? (
          <img src={movie.poster_url} alt={movie.title} className="w-full object-cover block" style={{ aspectRatio: '2/3' }} />
        ) : (
          <div className="w-full bg-cream flex items-center justify-center p-2 text-center" style={{ aspectRatio: '2/3' }}>
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
          {movie.genre && <div className="text-[0.65rem] text-warm-gray italic mt-1">{movie.genre}</div>}
          {movieLabels[movie.id]?.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1">
              {movieLabels[movie.id].map((label) => (
                <span key={label.id} className="bg-butter text-navy px-1.5 py-0.5 rounded-full text-[0.6rem]">
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderSectionHeader(label: Label) {
    return (
      <div key={`section-${label.id}`} className="mt-6 mb-3 flex items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-warm-gray font-serif">{label.name}</span>
        <div className="flex-1 border-t border-powder-blue" />
      </div>
    )
  }

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
            onClick={() => {
              const pool = filteredMovies.length > 0 ? filteredMovies : movies
              const shuffled = [...pool].sort(() => Math.random() - 0.5)
              const picked = shuffled.slice(0, Math.min(3, shuffled.length)).map(m => m.id)
              onShuffle(picked)
            }}
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
              onMovieAdded={(newId: string) => {
                onMovieAdded(newId)
                setShowAddForm(true)
              }}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Filter + sort bar */}
      {showFilters && !loading && movies.length > 0 && (
        <div className="border border-powder-blue rounded bg-white p-3 mb-4 flex flex-col gap-2">
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              type="text"
              placeholder="Search title or director / showrunner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputStyle} flex-1 min-w-0`}
            />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectClass}>
              <option value="">Movie &amp; TV</option>
              <option value="movie">Movie</option>
              <option value="tv">TV</option>
            </select>
            <select value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)} className={selectClass}>
              <option value="">All formats</option>
              <option>4K</option>
              <option>Blu-ray</option>
              <option>DVD</option>
              <option>VHS</option>
              <option>Digital</option>
            </select>
            {labels.some(l => (labelItems[l.id]?.length ?? 0) > 0) && (
              <div className="flex items-center gap-1">
                <select value={filterLabel} onChange={(e) => setFilterLabel(e.target.value)} className={selectClass}>
                  <option value="">All labels</option>
                  {labels.filter(l => (labelItems[l.id]?.length ?? 0) > 0).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                {filterLabel && (
                  <button
                    onClick={() => onManageLabel(filterLabel)}
                    className="bg-transparent border border-powder-blue text-warm-gray px-2 py-2 cursor-pointer font-serif rounded-sm text-xs whitespace-nowrap"
                    title="Edit order for this label"
                  >
                    Edit order
                  </button>
                )}
              </div>
            )}
            {allGenres.length > 0 && (
              <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} className={selectClass}>
                <option value="">All genres</option>
                {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
            {allRegions.length > 0 && (
              <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className={selectClass}>
                <option value="">All regions</option>
                {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <select value={filterRating} onChange={(e) => { setFilterRating(e.target.value); if (e.target.value === 'G') setRatingMode('exact') }} className={selectClass}>
              <option value="">All ratings</option>
              {RATING_ORDER.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {filterRating && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-warm-gray uppercase tracking-wider">Rating mode</span>
              <div className="flex text-xs">
                <button
                  onClick={() => setRatingMode('exact')}
                  className={`border border-powder-blue px-2.5 py-1 font-serif rounded-l-sm cursor-pointer ${ratingMode === 'exact' ? 'bg-powder-blue text-navy' : 'bg-white text-warm-gray'}`}
                >
                  Only
                </button>
                {filterRating !== 'G' && (
                  <button
                    onClick={() => setRatingMode('lower')}
                    className={`border border-l-0 border-powder-blue px-2.5 py-1 font-serif rounded-r-sm cursor-pointer ${ratingMode === 'lower' ? 'bg-powder-blue text-navy' : 'bg-white text-warm-gray'}`}
                  >
                    Lower than
                  </button>
                )}
              </div>
              <button
                onClick={() => setIncludeNR(v => !v)}
                className={`border border-powder-blue px-2.5 py-1 font-serif text-xs rounded-sm cursor-pointer ${includeNR ? 'bg-powder-blue text-navy' : 'bg-white text-warm-gray'}`}
              >
                Include NR
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-warm-gray uppercase tracking-wider">Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className={selectClass}>
                <option value="title-asc">Title A→Z</option>
                <option value="title-desc">Title Z→A</option>
                <option value="year-desc">Year (newest)</option>
                <option value="year-asc">Year (oldest)</option>
                <option value="director-asc">Director A→Z</option>
                <option value="director-desc">Director Z→A</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setSearch(''); setFilterType(''); setFilterFormat(''); setFilterLabel(''); setFilterGenre(''); setFilterRegion(''); setFilterRating(''); setRatingMode('exact'); setIncludeNR(true) }}
                className="text-sm text-warm-gray bg-transparent border-none cursor-pointer font-serif underline whitespace-nowrap"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        viewMode === 'list' ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-3 px-4 bg-white border border-powder-blue border-l-4 border-l-blush rounded animate-pulse">
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
              <div key={i} className="rounded overflow-hidden border border-powder-blue bg-white animate-pulse">
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
      ) : totalDisplayCount === 0 ? (
        <p className="text-warm-gray italic">No movies match your filters.</p>
      ) : (
        <>
          {/* Main list */}
          {mainItems.length > 0 && (
            viewMode === 'list' ? (
              <div className="flex flex-col gap-2">
                {mainItems.map(renderListRow)}
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {mainItems.map(renderGridCard)}
              </div>
            )
          )}

          {/* Section blocks */}
          {sectionBlocks.map(({ label, items }) => (
            <div key={`section-${label.id}`}>
              {renderSectionHeader(label)}
              {viewMode === 'list' ? (
                <div className="flex flex-col gap-2">
                  {items.map(renderListRow)}
                </div>
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                  {items.map(renderGridCard)}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
