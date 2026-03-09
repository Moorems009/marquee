'use client'

import { Movie } from '@/lib/types'

type Props = {
  movies: Movie[]
  nowPlayingIds: string[]
  nightMode?: boolean
  onClear?: () => void
}

const DAY = {
  header: '#C4747C',
  border: '#A8C4D4',
  panelBg: '#FDFAF5',
  neon: '#C4747C',
  title: '#2C3E6B',
  subtitle: '#8C7B6B',
  divider: '#ddd8cf',
  emptySlot: '#c8c0b4',
  bulbRow: '#ece7de',
  bulb: '#F0D882',
  bulbGlow: 'rgba(240, 216, 130, 0.6)',
}

const NIGHT = {
  header: '#FFD97A',
  border: '#00DFFF',
  panelBg: '#0D1520',
  neon: '#FF2878',
  title: '#C4D8E8',
  subtitle: '#3A5468',
  divider: '#152535',
  emptySlot: '#3A5468',
  bulbRow: '#07090F',
  bulb: '#FFD97A',
  bulbGlow: 'rgba(255, 217, 122, 0.7)',
}

export default function NowPlayingMarquee({ movies, nowPlayingIds, nightMode, onClear }: Props) {
  const c = nightMode ? NIGHT : DAY

  const slots = [0, 1, 2].map(i => {
    const id = nowPlayingIds[i]
    return id ? movies.find(m => m.id === id) ?? null : null
  })

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* "Now Playing" header above the sign */}
      <div style={{
        textAlign: 'center',
        color: c.header,
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
        border: `2px solid ${c.border}`,
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: nightMode
          ? `0 0 18px rgba(0, 223, 255, 0.2), 0 2px 10px rgba(0,0,0,0.6)`
          : '0 2px 10px rgba(44,62,107,0.1)'
      }}>
        {/* Top neon strip */}
        <div style={{
          height: '5px',
          backgroundColor: c.neon,
          boxShadow: nightMode ? `0 0 8px ${c.neon}` : 'none'
        }} />

        {/* Three panels */}
        <div style={{
          display: 'flex',
          backgroundColor: c.panelBg,
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
                borderRight: i < 2 ? `1px solid ${c.divider}` : 'none'
              }}
            >
              {movie ? (
                <>
                  <div style={{
                    color: c.title,
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
                  {(movie.year || movie.creator) && (
                    <div style={{
                      color: c.subtitle,
                      fontFamily: 'Georgia, serif',
                      fontSize: '0.7rem',
                      marginTop: '0.25rem',
                      fontStyle: 'italic'
                    }}>
                      {[movie.year, movie.creator].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  color: c.emptySlot,
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
        <div style={{
          height: '5px',
          backgroundColor: c.neon,
          boxShadow: nightMode ? `0 0 8px ${c.neon}` : 'none'
        }} />

        {/* Bulb row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '6px 12px',
          backgroundColor: c.bulbRow
        }}>
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: c.bulb,
              boxShadow: `0 0 3px 1px ${c.bulbGlow}`
            }} />
          ))}
        </div>
      </div>

      {onClear && nowPlayingIds.length > 0 && (
        <div style={{ textAlign: 'right', marginTop: '0.4rem' }}>
          <button
            onClick={onClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: c.emptySlot,
              fontFamily: 'Georgia, serif',
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              padding: '0.5rem 0 0.25rem 0.75rem',
              lineHeight: 1
            }}
          >
            clear
          </button>
        </div>
      )}
    </div>
  )
}
