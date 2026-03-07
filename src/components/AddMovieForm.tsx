'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { searchMovies, getMovieCredits, getMovieRating, getPosterUrl } from '@/lib/tmdb'
import { TMDBResult } from '@/lib/types'
import { inputStyle, sectionHeadingStyle } from '@/lib/styles'

type Props = {
  onMovieAdded: () => void
}

export default function AddMovieForm({ onMovieAdded }: Props) {
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [format, setFormat] = useState('Blu-ray')
  const [imprint, setImprint] = useState('')
  const [director, setDirector] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [mpaaRating, setMpaaRating] = useState('')
  const [message, setMessage] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleTitleChange(value: string) {
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

    const [{ director: directorName }, { mpaa_rating }] = await Promise.all([
      getMovieCredits(result.id),
      getMovieRating(result.id)
    ])
    if (directorName) setDirector(directorName)
    if (mpaa_rating) setMpaaRating(mpaa_rating)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    const { error } = await supabase
      .from('movies')
      .insert([{ title, year: parseInt(year), format, imprint, director, poster_url: posterUrl || null, mpaa_rating: mpaaRating || null, user_id: user?.id }])

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Movie added!')
      setTitle('')
      setYear('')
      setFormat('Blu-ray')
      setImprint('')
      setDirector('')
      setPosterUrl('')
      setMpaaRating('')
      onMovieAdded()
    }
  }

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid var(--powder-blue)',
      borderRadius: '4px',
      padding: '1.5rem',
      marginBottom: '2rem'
    }}>
      <h2 style={sectionHeadingStyle}>Add to your library</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <div style={{ flex: '3', minWidth: '160px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              required
              style={{ ...inputStyle, width: '100%' }}
            />
            {showDropdown && tmdbResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid var(--powder-blue)',
                borderTop: 'none',
                borderRadius: '0 0 4px 4px',
                zIndex: 100,
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
              }}>
                {tmdbResults.map((result) => (
                  <div
                    key={result.id}
                    onMouseDown={() => handleSelectTMDB(result)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--powder-blue)',
                      fontSize: '0.875rem',
                      color: 'var(--navy)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--cream)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                  >
                    {result.poster_path && (
                      <img
                        src={getPosterUrl(result.poster_path, 'w92')}
                        alt={result.title}
                        style={{ width: '32px', height: '48px', objectFit: 'cover', borderRadius: '2px' }}
                      />
                    )}
                    <div>
                      <span style={{ fontWeight: 'bold' }}>{result.title}</span>
                      {result.release_date && (
                        <span style={{ color: 'var(--warm-gray)', marginLeft: '0.5rem' }}>
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
            style={{ ...inputStyle, flex: '2', minWidth: '140px', width: 'auto' }}
          />
          <input
            type="number"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
            style={{ ...inputStyle, flex: '1', minWidth: '80px', width: 'auto' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={{ ...inputStyle, flex: '1', minWidth: '100px', width: 'auto' }}
          >
            <option>Blu-ray</option>
            <option>4K UHD</option>
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
            style={{ ...inputStyle, flex: '3', minWidth: '160px', width: 'auto' }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: 'var(--powder-blue)',
              color: 'var(--navy)',
              border: 'none',
              padding: '0.5rem 1.5rem',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              borderRadius: '2px',
              fontWeight: 'bold'
            }}
          >
            Add
          </button>
        </div>
      </form>
      {message && (
        <p style={{ margin: '0.75rem 0 0 0', color: 'var(--dusty-rose)', fontSize: '0.875rem' }}>
          {message}
        </p>
      )}
    </div>
  )
}