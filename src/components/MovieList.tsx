'use client'

import { Movie, Label } from '@/lib/types'

type Props = {
  movies: Movie[]
  loading: boolean
  viewMode: 'list' | 'grid'
  movieLabels: Record<string, Label[]>
  onEdit: (movie: Movie) => void
  onViewModeChange: (mode: 'list' | 'grid') => void
}

export default function MovieList({
  movies,
  loading,
  viewMode,
  movieLabels,
  onEdit,
  onViewModeChange
}: Props) {
  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h2 style={{
          fontSize: '1.1rem',
          color: 'var(--dusty-rose)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0
        }}>My Library</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onViewModeChange('list')}
            style={{
              backgroundColor: viewMode === 'list' ? 'var(--powder-blue)' : 'white',
              color: 'var(--navy)',
              border: '1px solid var(--powder-blue)',
              padding: '0.3rem 0.75rem',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              borderRadius: '2px',
              fontSize: '0.8rem'
            }}
          >
            ☰ List
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            style={{
              backgroundColor: viewMode === 'grid' ? 'var(--powder-blue)' : 'white',
              color: 'var(--navy)',
              border: '1px solid var(--powder-blue)',
              padding: '0.3rem 0.75rem',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              borderRadius: '2px',
              fontSize: '0.8rem'
            }}
          >
            ⊞ Grid
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--warm-gray)' }}>Loading...</p>
      ) : movies.length === 0 ? (
        <p style={{ color: 'var(--warm-gray)', fontStyle: 'italic' }}>No movies yet. Add some!</p>
      ) : viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {movies.map((movie) => (
            <div
              key={movie.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                backgroundColor: 'white',
               borderTop: '1px solid var(--powder-blue)',
                borderRight: '1px solid var(--powder-blue)',
                borderBottom: '1px solid var(--powder-blue)',
                borderLeft: '4px solid var(--blush)',
                borderRadius: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {movie.poster_url && (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    style={{ width: '32px', height: '48px', objectFit: 'cover', borderRadius: '2px' }}
                  />
                )}
                <div>
                  <span style={{ fontWeight: 'bold', color: 'var(--navy)' }}>{movie.title}</span>
                  <span style={{ color: 'var(--warm-gray)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                    ({movie.year})
                  </span>
                  {movie.director && (
                    <span style={{ color: 'var(--warm-gray)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                      — {movie.director}
                    </span>
                  )}
                  {movieLabels[movie.id]?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                      {movieLabels[movie.id].map((label) => (
                        <span
                          key={label.id}
                          style={{
                            backgroundColor: 'var(--butter)',
                            color: 'var(--navy)',
                            padding: '0.1rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            fontFamily: 'Georgia, serif'
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'white',
                  backgroundColor: 'var(--mint)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '2px',
                  whiteSpace: 'nowrap'
                }}>
                  {movie.format}
                </span>
                {movie.imprint && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontStyle: 'italic',
                    color: 'var(--navy)',
                    backgroundColor: 'var(--powder-blue)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '2px',
                    whiteSpace: 'nowrap'
                  }}>
                    {movie.imprint}
                  </span>
                )}
                {movie.mpaa_rating && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--navy)',
                    border: '1px solid var(--warm-gray)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '2px',
                    whiteSpace: 'nowrap',
                    fontFamily: 'Georgia, serif'
                  }}>
                    {movie.mpaa_rating}
                  </span>
                )}
                <button
                  onClick={() => onEdit(movie)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--powder-blue)',
                    color: 'var(--warm-gray)',
                    padding: '0.2rem 0.6rem',
                    cursor: 'pointer',
                    fontFamily: 'Georgia, serif',
                    borderRadius: '2px',
                    fontSize: '0.75rem'
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
          {movies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => onEdit(movie)}
              style={{
                cursor: 'pointer',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid var(--powder-blue)',
                backgroundColor: 'white',
                transition: 'transform 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  aspectRatio: '2/3',
                  backgroundColor: 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--warm-gray)', fontStyle: 'italic' }}>
                    {movie.title}
                  </span>
                </div>
              )}
              <div style={{ padding: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--navy)', marginBottom: '0.2rem' }}>
                  {movie.title}
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  color: 'white',
                  backgroundColor: 'var(--mint)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '2px',
                  display: 'inline-block'
                }}>
                  {movie.format}
                </div>
                {movie.imprint && (
                  <div style={{
                    fontSize: '0.65rem',
                    fontStyle: 'italic',
                    color: 'var(--navy)',
                    backgroundColor: 'var(--powder-blue)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '2px',
                    display: 'inline-block',
                    marginLeft: '0.25rem'
                  }}>
                    {movie.imprint}
                  </div>
                )}
                {movie.mpaa_rating && (
                  <div style={{
                    fontSize: '0.65rem',
                    color: 'var(--navy)',
                    border: '1px solid var(--warm-gray)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '2px',
                    display: 'inline-block',
                    marginLeft: '0.25rem',
                    fontFamily: 'Georgia, serif'
                  }}>
                    {movie.mpaa_rating}
                  </div>
                )}
                {movieLabels[movie.id]?.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                    {movieLabels[movie.id].map((label) => (
                      <span
                        key={label.id}
                        style={{
                          backgroundColor: 'var(--butter)',
                          color: 'var(--navy)',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '999px',
                          fontSize: '0.6rem'
                        }}
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