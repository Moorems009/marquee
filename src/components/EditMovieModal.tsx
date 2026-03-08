'use client'

import { useState, useRef } from 'react'
import { Movie, Label, TMDBResult } from '@/lib/types'
import { inputStyle, fieldLabelStyle } from '@/lib/styles'
import { searchMovies, getMovieCredits, getMovieRating, getMovieGenre, getPosterUrl } from '@/lib/tmdb'

type Props = {
  movie: Movie
  editData: Partial<Movie>
  editMovieLabels: Label[]
  labels: Label[]
  onClose: () => void
  onSave: (updates: Partial<Movie>, newLabelName: string) => Promise<void>
  onDelete: () => Promise<void>
  onSelectExistingLabel: (label: Label) => Promise<void>
  onRemoveLabel: (label: Label) => Promise<void>
  setEditData: (data: Partial<Movie>) => void
}

export default function EditMovieModal({
  movie,
  editData,
  editMovieLabels,
  labels,
  onClose,
  onSave,
  onDelete,
  onSelectExistingLabel,
  onRemoveLabel,
  setEditData
}: Props) {
  const [labelInput, setLabelInput] = useState('')
  const [labelSuggestions, setLabelSuggestions] = useState<Label[]>([])
  const [showLabelDropdown, setShowLabelDropdown] = useState(false)
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [showTmdbDropdown, setShowTmdbDropdown] = useState(false)
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
        !editMovieLabels.find((el) => el.id === l.id)
    )
    setLabelSuggestions(filtered)
    setShowLabelDropdown(filtered.length > 0)
  }

  function handleTitleChange(value: string) {
    setEditData({ ...editData, title: value })
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      if (value.length < 3) {
        setTmdbResults([])
        setShowTmdbDropdown(false)
        return
      }
      const results = await searchMovies(value)
      setTmdbResults(results)
      setShowTmdbDropdown(true)
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
    if (director) updates.director = director
    if (mpaa_rating !== undefined) updates.mpaa_rating = mpaa_rating
    if (genre !== undefined) updates.genre = genre

    setEditData(updates)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(44, 62, 107, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--cream)',
          border: '1px solid var(--powder-blue)',
          borderRadius: '4px',
          padding: '2rem',
          width: '100%',
          maxWidth: '500px',
          margin: '1rem',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <h2 style={{
          margin: '0 0 1.5rem 0',
          fontSize: '1.1rem',
          color: 'var(--dusty-rose)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>Edit Movie</h2>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {editData.poster_url && (
            <img
              src={editData.poster_url}
              alt={editData.title}
              style={{ width: '80px', height: '120px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>

            {/* Title with TMDB autocomplete */}
            <div style={{ position: 'relative' }}>
              <label className={fieldLabelStyle}>Title</label>
              <input
                type="text"
                value={editData.title || ''}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowTmdbDropdown(false), 150)}
                className={inputStyle}
              />
              {showTmdbDropdown && tmdbResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid var(--powder-blue)',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  zIndex: 200,
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

            <div>
              <label className={fieldLabelStyle}>Director</label>
              <input
                type="text"
                value={editData.director || ''}
                onChange={(e) => setEditData({ ...editData, director: e.target.value })}
                className={inputStyle}
              />
            </div>
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
                <option>4K UHD</option>
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
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem', marginTop: '0.25rem' }}>
                  {editMovieLabels.map((label) => (
                    <span
                      key={label.id}
                      style={{
                        backgroundColor: 'var(--butter)',
                        color: 'var(--navy)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      {label.name}
                      <button
                        onClick={() => onRemoveLabel(label)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--warm-gray)',
                          padding: 0,
                          fontSize: '0.75rem',
                          lineHeight: 1
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Add a label..."
                  value={labelInput}
                  onChange={(e) => handleLabelInput(e.target.value)}
                  onBlur={() => setTimeout(() => setShowLabelDropdown(false), 150)}
                  className={inputStyle}
                />
                {showLabelDropdown && labelSuggestions.length > 0 && (
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
                    {labelSuggestions.map((label) => (
                      <div
                        key={label.id}
                        onMouseDown={() => {
                          onSelectExistingLabel(label)
                          setLabelInput('')
                          setShowLabelDropdown(false)
                        }}
                        style={{
                          padding: '0.5rem 0.75rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          color: 'var(--navy)',
                          borderBottom: '1px solid var(--powder-blue)'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--cream)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                      >
                        {label.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--warm-gray)', margin: '0.4rem 0 0 0', fontStyle: 'italic' }}>
                Select an existing label or type a new one and click Save
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <button
            onClick={onDelete}
            style={{
              backgroundColor: 'white',
              color: 'var(--dusty-rose)',
              border: '1px solid var(--dusty-rose)',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              borderRadius: '2px',
              fontSize: '0.875rem'
            }}
          >
            Delete
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'white',
                color: 'var(--warm-gray)',
                border: '1px solid var(--warm-gray)',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontFamily: 'Georgia, serif',
                borderRadius: '2px',
                fontSize: '0.875rem'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(editData, labelInput)}
              style={{
                backgroundColor: 'var(--powder-blue)',
                color: 'var(--navy)',
                border: 'none',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontFamily: 'Georgia, serif',
                borderRadius: '2px',
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
