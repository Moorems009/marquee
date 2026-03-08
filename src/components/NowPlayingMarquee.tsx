'use client'

import { Movie } from '@/lib/types'

type Props = {
  movies: Movie[]
  nowPlayingIds: string[]
}

export default function NowPlayingMarquee({ movies, nowPlayingIds }: Props) {
  const slots = [0, 1, 2].map(i => {
    const id = nowPlayingIds[i]
    return id ? movies.find(m => m.id === id) ?? null : null
  })

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* "Now Playing" header above the sign */}
      <div style={{
        textAlign: 'center',
        color: '#C4747C',
        fontFamily: 'Georgia, serif',
        fontSize: '1.6rem',
        fontStyle: 'italic',
        letterSpacing: '0.08em',
        marginBottom: '0.5rem',
        lineHeight: 1
      }}>
        Now Playing
      </div>

      {/* Sign board */}
      <div style={{
        border: '2px solid #A8C4D4',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(44,62,107,0.1)'
      }}>
        {/* Top neon strip */}
        <div style={{ height: '5px', backgroundColor: '#C4747C' }} />

        {/* Three panels */}
        <div style={{
          display: 'flex',
          backgroundColor: '#FDFAF5',
          minHeight: '4.5rem'
        }}>
          {slots.map((movie, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0.75rem 1.25rem',
                borderRight: i < 2 ? '1px solid #ddd8cf' : 'none'
              }}
            >
              {movie ? (
                <>
                  <div style={{
                    color: '#2C3E6B',
                    fontFamily: 'Georgia, serif',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {movie.title}
                  </div>
                  {(movie.year || movie.director) && (
                    <div style={{
                      color: '#8C7B6B',
                      fontFamily: 'Georgia, serif',
                      fontSize: '0.7rem',
                      marginTop: '0.25rem',
                      fontStyle: 'italic'
                    }}>
                      {[movie.year, movie.director].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  color: '#c8c0b4',
                  fontFamily: 'Georgia, serif',
                  fontSize: '0.75rem',
                  letterSpacing: '0.15em'
                }}>
                  — — —
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom neon strip */}
        <div style={{ height: '5px', backgroundColor: '#C4747C' }} />

        {/* Bulb row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '6px 12px',
          backgroundColor: '#ece7de'
        }}>
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: '#F0D882',
              boxShadow: '0 0 3px 1px rgba(240,216,130,0.6)'
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}
