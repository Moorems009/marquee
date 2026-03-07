'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fieldLabelStyle, sectionHeadingStyle } from '@/lib/styles'
import { searchMovies, getMovieCredits, getMovieRating, getPosterUrl } from '@/lib/tmdb'
import { Movie } from '@/lib/types'

type UserSettings = {
  defaultView: 'list' | 'grid'
}

type Props = {
  currentSettings: UserSettings
  movies: Movie[]
  onClose: () => void
  onSave: (settings: UserSettings) => void
  onRefreshComplete: () => void
}

export default function SettingsModal({ currentSettings, movies, onClose, onSave, onRefreshComplete }: Props) {
  const supabase = createClient()
  const [defaultView, setDefaultView] = useState<'list' | 'grid'>(currentSettings.defaultView)
  const [saving, setSaving] = useState(false)
  const [refreshState, setRefreshState] = useState<'idle' | 'running' | 'done'>('idle')
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number } | null>(null)
  const [refreshSummary, setRefreshSummary] = useState<{ updated: number; skipped: number; notFound: string[] } | null>(null)

  async function handleRefreshTMDB() {
    const needsData = movies.filter((m) => !m.mpaa_rating || !m.director || !m.poster_url)
    if (needsData.length === 0) {
      setRefreshSummary({ updated: 0, skipped: movies.length, notFound: [] })
      setRefreshState('done')
      return
    }

    setRefreshState('running')
    setRefreshProgress({ current: 0, total: needsData.length })

    let updated = 0
    const notFound: string[] = []

    for (let i = 0; i < needsData.length; i++) {
      const movie = needsData[i]
      setRefreshProgress({ current: i, total: needsData.length })

      try {
        const results = await searchMovies(movie.title)
        const match = results.find((r: { title: string; release_date: string }) =>
          r.title.toLowerCase() === movie.title.toLowerCase() &&
          (movie.year ? r.release_date?.startsWith(String(movie.year)) : true)
        ) || results[0]

        if (match) {
          const [creditsData, ratingData] = await Promise.all([
            !movie.director ? getMovieCredits(match.id) : Promise.resolve({ director: null }),
            !movie.mpaa_rating ? getMovieRating(match.id) : Promise.resolve({ mpaa_rating: null })
          ])

          const updates: Partial<{ director: string; poster_url: string; mpaa_rating: string }> = {}
          if (!movie.director && creditsData.director) updates.director = creditsData.director
          if (!movie.poster_url && match.poster_path) updates.poster_url = getPosterUrl(match.poster_path)
          if (!movie.mpaa_rating && ratingData.mpaa_rating) updates.mpaa_rating = ratingData.mpaa_rating

          if (Object.keys(updates).length > 0) {
            await supabase.from('movies').update(updates).eq('id', movie.id)
            updated++
          } else {
            notFound.push(movie.title + (movie.year ? ' (' + movie.year + ')' : ''))
          }
        } else {
          notFound.push(movie.title + (movie.year ? ' (' + movie.year + ')' : ''))
        }
      } catch {
        notFound.push(movie.title + (movie.year ? ' (' + movie.year + ')' : ''))
      }
    }

    setRefreshProgress({ current: needsData.length, total: needsData.length })
    setRefreshSummary({ updated, skipped: movies.length - needsData.length, notFound })
    setRefreshState('done')
    onRefreshComplete()
  }

  async function handleSave() {
    setSaving(true)
    const settings: UserSettings = { defaultView }
    await supabase.auth.updateUser({ data: { settings } })
    onSave(settings)
    setSaving(false)
    onClose()
  }

  const viewButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.4rem 1rem',
    border: '1px solid var(--powder-blue)',
    borderRadius: '2px',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    fontSize: '0.875rem',
    backgroundColor: active ? 'var(--powder-blue)' : 'white',
    color: 'var(--navy)',
  })

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid var(--powder-blue)',
          borderRadius: '4px',
          padding: '2rem',
          width: '360px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ ...sectionHeadingStyle, marginTop: 0, marginBottom: '1.5rem' }}>Settings</h2>

        {/* Default View */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ ...fieldLabelStyle, marginBottom: '0.5rem' }}>Default View</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={viewButtonStyle(defaultView === 'list')} onClick={() => setDefaultView('list')}>
              ☰ List
            </button>
            <button style={viewButtonStyle(defaultView === 'grid')} onClick={() => setDefaultView('grid')}>
              ⊞ Grid
            </button>
          </div>
        </div>

        {/* Library Data */}
        <div style={{ marginBottom: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--powder-blue)' }}>
          <div style={{ ...fieldLabelStyle, marginBottom: '0.5rem' }}>Library Data</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--warm-gray)', margin: '0 0 0.75rem 0' }}>
            Fill in missing TMDB data (poster, director, MPAA rating) for all movies in your library.
          </p>
          <button
            onClick={handleRefreshTMDB}
            disabled={refreshState === 'running'}
            style={{
              background: refreshState === 'running' ? 'var(--warm-gray)' : 'var(--powder-blue)',
              border: 'none',
              padding: '0.4rem 1rem',
              cursor: refreshState === 'running' ? 'default' : 'pointer',
              fontFamily: 'Georgia, serif',
              fontSize: '0.875rem',
              color: 'var(--navy)',
              borderRadius: '2px',
              opacity: refreshState === 'running' ? 0.7 : 1,
            }}
          >
            {refreshState === 'running' ? 'Refreshing…' : 'Refresh TMDB Data'}
          </button>

          {refreshProgress && refreshState === 'running' && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--warm-gray)', marginBottom: '0.3rem' }}>
                <span>Processing…</span>
                <span>{refreshProgress.current} / {refreshProgress.total}</span>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--powder-blue)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${refreshProgress.total > 0 ? (refreshProgress.current / refreshProgress.total) * 100 : 0}%`,
                  backgroundColor: 'var(--mint)',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          {refreshSummary && refreshState === 'done' && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--warm-gray)' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Done — {refreshSummary.updated} updated · {refreshSummary.skipped} already complete
              {refreshSummary.notFound.length > 0 && ` · ${refreshSummary.notFound.length} not found on TMDB`}
            </p>
            {refreshSummary.notFound.length > 0 && (
              <div style={{
                backgroundColor: 'var(--cream)',
                border: '1px solid var(--powder-blue)',
                borderRadius: '4px',
                padding: '0.5rem 0.75rem',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                <div style={{ fontStyle: 'italic', marginBottom: '0.3rem' }}>Not found on TMDB:</div>
                {refreshSummary.notFound.map((title, i) => (
                  <div key={i} style={{ color: 'var(--navy)', fontSize: '0.75rem', paddingLeft: '0.5rem' }}>
                    {title}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '2rem' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid var(--powder-blue)',
              padding: '0.4rem 1rem',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              fontSize: '0.875rem',
              color: 'var(--warm-gray)',
              borderRadius: '2px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'var(--powder-blue)',
              border: '1px solid var(--powder-blue)',
              padding: '0.4rem 1rem',
              cursor: saving ? 'default' : 'pointer',
              fontFamily: 'Georgia, serif',
              fontSize: '0.875rem',
              color: 'var(--navy)',
              borderRadius: '2px',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
