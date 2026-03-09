'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { searchMovies, getMovieCredits, getMovieRating, getMovieGenre, getPosterUrl } from '@/lib/tmdb'
import { TMDBResult, Movie } from '@/lib/types'
import { inputStyle, sectionHeadingStyle } from '@/lib/styles'

type Props = {
  movies: Movie[]
  onMovieAdded: (newId: string) => void
}

export default function AddMovieForm({ movies, onMovieAdded }: Props) {
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [format, setFormat] = useState('Blu-ray')
  const [imprint, setImprint] = useState('')
  const [director, setDirector] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [mpaaRating, setMpaaRating] = useState('')
  const [genre, setGenre] = useState('')
  const [message, setMessage] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleTitleChange(value: string) {
    setPendingConfirm(false)
    setTitle(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      if (value.length < 3) {
        setTmdbResults([])
        setShowDropdown(false)
        return
      }
      const results = await searchMovies(value)
      setTmdbResults(results)
      setShowDropdown(true)
    }, 300)
  }

  async function handleSelectTMDB(result: TMDBResult) {
    setTitle(result.title)
    setYear(result.release_date ? result.release_date.split('-')[0] : '')
    setShowDropdown(false)
    setTmdbResults([])

    if (result.poster_path) {
      setPosterUrl(getPosterUrl(result.poster_path))
    }

    const [{ director: directorName }, { mpaa_rating }, { genre: genreValue }] = await Promise.all([
      getMovieCredits(result.id),
      getMovieRating(result.id),
      getMovieGenre(result.id)
    ])
    if (directorName) setDirector(directorName)
    if (mpaa_rating) setMpaaRating(mpaa_rating)
    if (genreValue) setGenre(genreValue)
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

    if (duplicateMovie && !pendingConfirm) {
      setPendingConfirm(true)
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    const { data: inserted, error } = await supabase
      .from('movies')
      .insert([{ title, year: parseInt(year), format, imprint, director, poster_url: posterUrl || null, mpaa_rating: mpaaRating || null, genre: genre || null, user_id: user?.id }])
      .select('id')
      .single()

    if (error || !inserted) {
      setMessage(`Error: ${error?.message}`)
    } else {
      setMessage('Movie added!')
      setTitle('')
      setYear('')
      setFormat('Blu-ray')
      setImprint('')
      setDirector('')
      setPosterUrl('')
      setMpaaRating('')
      setGenre('')
      setPendingConfirm(false)
      onMovieAdded(inserted.id)
    }
  }

  return (
    <div className="bg-white border border-powder-blue rounded p-6 mb-8">
      <h2 className={sectionHeadingStyle}>Add to your shelf</h2>
      <form onSubmit={handleSubmit}>

        {/* Row 1: Title | Director | Year */}
        <div className="grid grid-cols-1 gap-3 mb-3 md:grid-cols-[3fr_2fr_1fr]">
          <div className="relative">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              required
              className={inputStyle}
            />
            {showDropdown && tmdbResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-powder-blue border-t-0 rounded-b z-100 shadow-md">
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
                        className="w-8 h-12 object-cover rounded-sm shrink-0"
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
          </div>
          <input
            type="text"
            placeholder="Director"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
            className={inputStyle}
          />
          <input
            type="number"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
            className={inputStyle}
          />
        </div>

        {/* Row 2: Format | Imprint | Add button */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_3fr_auto]">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={inputStyle}
          >
            <option>Blu-ray</option>
            <option>4K</option>
            <option>DVD</option>
            <option>VHS</option>
            <option>Digital</option>
          </select>
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
      {message && (
        <p className="mt-3 text-dusty-rose text-sm">
          {message}
        </p>
      )}
    </div>
  )
}
