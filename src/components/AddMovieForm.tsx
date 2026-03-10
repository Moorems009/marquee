'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { searchMovies, getMovieCredits, getMovieRating, getMovieGenre, getPosterUrl, searchTVShows, getTVDetails, getTVSeasonDetails } from '@/lib/tmdb'
import { TMDBResult, TVShowResult, Movie } from '@/lib/types'
import { inputStyle, sectionHeadingStyle } from '@/lib/styles'
import BarcodeScannerModal, { type BarcodeResult } from './BarcodeScannerModal'

type Props = {
  movies: Movie[]
  onMovieAdded: (newId: string) => void
}

export default function AddMovieForm({ movies, onMovieAdded }: Props) {
  const supabase = createClient()

  const [itemType, setItemType] = useState<'movie' | 'tv_season'>('movie')
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [format, setFormat] = useState('Blu-ray')
  const [imprint, setImprint] = useState('')
  const [region, setRegion] = useState('')
  const [creator, setCreator] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [mpaaRating, setMpaaRating] = useState('')
  const [genre, setGenre] = useState('')
  const [message, setMessage] = useState('')
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Movie TMDB dropdown
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  // TV season state
  const [tvResults, setTvResults] = useState<TVShowResult[]>([])
  const [showTvDropdown, setShowTvDropdown] = useState(false)
  const [tvShowId, setTvShowId] = useState<number | null>(null)
  const [seasonNumber, setSeasonNumber] = useState('')
  const [seasonLookupState, setSeasonLookupState] = useState<'idle' | 'loading' | 'done'>('idle')

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seasonTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function resetForm() {
    setTitle(''); setYear(''); setFormat('Blu-ray'); setImprint('')
    setCreator(''); setPosterUrl(''); setMpaaRating(''); setGenre(''); setRegion('')
    setMessage(''); setPendingConfirm(false)
    setTmdbResults([]); setShowDropdown(false)
    setTvResults([]); setShowTvDropdown(false)
    setTvShowId(null); setSeasonNumber(''); setSeasonLookupState('idle')
  }

  function switchItemType(type: 'movie' | 'tv_season') {
    setItemType(type)
    resetForm()
  }

  // Movie title autocomplete
  function handleTitleChange(value: string) {
    setPendingConfirm(false)
    setTitle(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      if (value.length < 3) { setTmdbResults([]); setShowDropdown(false); return }
      const results = await searchMovies(value)
      setTmdbResults(results)
      setShowDropdown(true)
    }, 300)
  }

  async function handleSelectTMDB(result: TMDBResult) {
    setTitle(result.title)
    setYear(result.release_date ? result.release_date.split('-')[0] : '')
    setShowDropdown(false); setTmdbResults([])
    if (result.poster_path) setPosterUrl(getPosterUrl(result.poster_path))
    const [{ director: directorName }, { mpaa_rating }, { genre: genreValue }] = await Promise.all([
      getMovieCredits(result.id), getMovieRating(result.id), getMovieGenre(result.id)
    ])
    if (directorName) setCreator(directorName)
    if (mpaa_rating) setMpaaRating(mpaa_rating)
    if (genreValue) setGenre(genreValue)
  }

  // TV show name autocomplete
  function handleTVTitleChange(value: string) {
    setPendingConfirm(false)
    setTitle(value)
    setTvShowId(null); setSeasonNumber(''); setSeasonLookupState('idle')
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      if (value.length < 3) { setTvResults([]); setShowTvDropdown(false); return }
      const results = await searchTVShows(value)
      setTvResults(results)
      setShowTvDropdown(true)
    }, 300)
  }

  async function handleSelectTVShow(result: TVShowResult) {
    setTitle(result.name)
    setShowTvDropdown(false); setTvResults([])
    setTvShowId(result.id)
    setSeasonNumber(''); setSeasonLookupState('idle')
    if (result.poster_path) setPosterUrl(getPosterUrl(result.poster_path))
    const details = await getTVDetails(result.id)
    if (details.creator) setCreator(details.creator)
    if (details.genre) setGenre(details.genre)
    if (!result.poster_path && details.poster_path) setPosterUrl(getPosterUrl(details.poster_path))
  }

  function handleSeasonNumberChange(value: string) {
    setSeasonNumber(value)
    setSeasonLookupState('idle')
    if (seasonTimeout.current) clearTimeout(seasonTimeout.current)
    if (!tvShowId || !value || isNaN(parseInt(value))) return
    seasonTimeout.current = setTimeout(async () => {
      setSeasonLookupState('loading')
      const details = await getTVSeasonDetails(tvShowId, parseInt(value))
      if (details.air_date) setYear(details.air_date.split('-')[0])
      if (details.poster_path) setPosterUrl(getPosterUrl(details.poster_path))
      if (details.tv_rating) setMpaaRating(details.tv_rating)
      setSeasonLookupState('done')
    }, 600)
  }

  function handleBarcodeScan(result: BarcodeResult) {
    setShowScanner(false)
    setTitle(result.title)
    setYear(result.year ? String(result.year) : '')
    if (result.poster_url) setPosterUrl(result.poster_url)
    if (result.director) setCreator(result.director)
    if (result.mpaa_rating) setMpaaRating(result.mpaa_rating)
    if (result.genre) setGenre(result.genre)
    if (result.format) setFormat(result.format)
    setPendingConfirm(false)
  }

  const duplicateMovie = title && year
    ? movies.find(
        (m) => m.title.toLowerCase() === title.toLowerCase() &&
               String(m.year) === year &&
               m.format === format
      ) ?? null
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    if (duplicateMovie && !pendingConfirm) { setPendingConfirm(true); return }

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    const record: Record<string, unknown> = {
      title,
      year: parseInt(year),
      format,
      imprint: imprint || null,
      region: region || null,
      creator: creator || null,
      poster_url: posterUrl || null,
      mpaa_rating: mpaaRating || null,
      genre: genre || null,
      user_id: user?.id,
      item_type: itemType,
    }
    if (itemType === 'tv_season') {
      record.show_title = title
      record.season_number = seasonNumber ? parseInt(seasonNumber) : null
    }

    const { data: inserted, error } = await supabase
      .from('media_items')
      .insert([record])
      .select('id')
      .single()

    if (error || !inserted) {
      setMessage(`Error: ${error?.message}`)
    } else {
      setMessage(itemType === 'tv_season' ? 'Season added!' : 'Movie added!')
      resetForm()
      onMovieAdded(inserted.id)
    }
  }

  const toggleBtnClass = (active: boolean) =>
    `px-4 py-1 font-serif text-sm cursor-pointer border-none rounded-sm ${active ? 'bg-navy text-white' : 'bg-cream text-warm-gray'}`

  return (
    <div className="bg-white border border-powder-blue rounded p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`${sectionHeadingStyle} mb-0`}>Add to your shelf</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-sm overflow-hidden border border-powder-blue">
            <button type="button" onClick={() => switchItemType('movie')} className={toggleBtnClass(itemType === 'movie')}>Movie</button>
            <button type="button" onClick={() => switchItemType('tv_season')} className={toggleBtnClass(itemType === 'tv_season')}>TV</button>
          </div>
          <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="bg-transparent border border-powder-blue text-navy px-3 py-1 cursor-pointer font-serif rounded-sm text-[0.8rem] flex items-center gap-1.5 hover:bg-powder-blue transition-colors"
              title="Scan barcode"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
                <line x1="8" y1="5.5" x2="16" y2="5.5"/><line x1="5.5" y1="8" x2="5.5" y2="16"/><line x1="18.5" y1="8" x2="18.5" y2="16"/>
                <line x1="8" y1="18.5" x2="16" y2="18.5"/><line x1="16" y1="13" x2="21" y2="13"/><line x1="13" y1="16" x2="13" y2="21"/>
              </svg>
              Scan
            </button>
        </div>
      </div>

      {showScanner && (
        <BarcodeScannerModal onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}

      <form onSubmit={handleSubmit}>
        {/* Row 1 — TV season has an extra Season # column */}
        <div className={`grid grid-cols-1 gap-3 mb-3 ${itemType === 'tv_season' ? 'md:grid-cols-[3fr_2fr_1fr_1fr]' : 'md:grid-cols-[3fr_2fr_1fr]'}`}>

          {/* Title / Show Name */}
          <div className="relative">
            <input
              type="text"
              placeholder={itemType === 'tv_season' ? 'Show Name' : 'Title'}
              value={title}
              onChange={(e) => itemType === 'tv_season' ? handleTVTitleChange(e.target.value) : handleTitleChange(e.target.value)}
              onBlur={() => setTimeout(() => { setShowDropdown(false); setShowTvDropdown(false) }, 150)}
              required
              className={inputStyle}
            />
            {itemType === 'movie' && showDropdown && tmdbResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b z-100 shadow-md">
                {tmdbResults.map((result) => (
                  <div key={result.id} onMouseDown={() => handleSelectTMDB(result)}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-powder-blue text-sm text-navy hover:bg-cream">
                    {result.poster_path && (
                      <img src={getPosterUrl(result.poster_path, 'w92')} alt={result.title} className="w-8 h-12 object-cover rounded-sm shrink-0" />
                    )}
                    <div>
                      <span className="font-bold">{result.title}</span>
                      {result.release_date && <span className="text-warm-gray ml-2">({result.release_date.split('-')[0]})</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {itemType === 'tv_season' && showTvDropdown && tvResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b z-100 shadow-md">
                {tvResults.map((result) => (
                  <div key={result.id} onMouseDown={() => handleSelectTVShow(result)}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-powder-blue text-sm text-navy hover:bg-cream">
                    {result.poster_path && (
                      <img src={getPosterUrl(result.poster_path, 'w92')} alt={result.name} className="w-8 h-12 object-cover rounded-sm shrink-0" />
                    )}
                    <div>
                      <span className="font-bold">{result.name}</span>
                      {result.first_air_date && <span className="text-warm-gray ml-2">({result.first_air_date.split('-')[0]})</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Director / Showrunner */}
          <input
            type="text"
            placeholder="Director / Showrunner"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            className={inputStyle}
          />

          {/* Season # (TV only) */}
          {itemType === 'tv_season' && (
            <div className="relative">
              <input
                type="number"
                placeholder="Season"
                value={seasonNumber}
                onChange={(e) => handleSeasonNumberChange(e.target.value)}
                min={1}
                className={inputStyle}
              />
              {seasonLookupState === 'loading' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-warm-gray">…</span>
              )}
            </div>
          )}

          {/* Year */}
          <input
            type="number"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
            className={inputStyle}
          />
        </div>

        {/* Row 2: Format | Region | Imprint | Add button */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_2fr_auto]">
          <select value={format} onChange={(e) => setFormat(e.target.value)} className={inputStyle}>
            <option>Blu-ray</option>
            <option>4K</option>
            <option>DVD</option>
            <option>VHS</option>
            <option>Digital</option>
          </select>
          <input
            type="text"
            placeholder="Region (e.g. A, B, 1)"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={inputStyle}
          />
          <input
            type="text"
            placeholder="Imprint (e.g. Criterion, Arrow)"
            value={imprint}
            onChange={(e) => setImprint(e.target.value)}
            className={inputStyle}
          />
          <button
            type="submit"
            className={`border-none py-2 px-6 cursor-pointer font-serif rounded-sm font-bold ${pendingConfirm ? 'bg-dusty-rose text-white' : 'bg-powder-blue text-navy'}`}
          >
            {pendingConfirm ? 'Add anyway' : 'Add'}
          </button>
        </div>
      </form>

      {duplicateMovie && !message && (
        <p className="mt-3 text-dusty-rose text-sm">
          Already in your shelf as {duplicateMovie.format}{duplicateMovie.imprint ? ` (${duplicateMovie.imprint})` : ''}.{' '}
          {pendingConfirm ? 'Click "Add anyway" to add it again.' : ''}
        </p>
      )}
      {message && <p className="mt-3 text-dusty-rose text-sm">{message}</p>}
    </div>
  )
}
