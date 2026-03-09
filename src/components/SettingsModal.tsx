'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fieldLabelStyle, sectionHeadingStyle } from '@/lib/styles'
import { searchMovies, getMovieCredits, getMovieRating, getMovieGenre, getPosterUrl } from '@/lib/tmdb'
import { Movie } from '@/lib/types'

type UserSettings = {
  nightMode: boolean
}

type Props = {
  currentSettings: UserSettings
  movies: Movie[]
  onClose: () => void
  onSave: (settings: UserSettings) => void
  onRefreshComplete: () => void
  onClearLibrary: () => void
}

export default function SettingsModal({ currentSettings, movies, onClose, onSave, onRefreshComplete, onClearLibrary }: Props) {
  const supabase = createClient()
  const [nightMode, setNightMode] = useState(currentSettings.nightMode)
  const [saving, setSaving] = useState(false)
  const [refreshState, setRefreshState] = useState<'idle' | 'running' | 'done'>('idle')
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number } | null>(null)
  const [refreshSummary, setRefreshSummary] = useState<{ updated: number; skipped: number; notFound: string[] } | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  async function handleRefreshTMDB() {
    const needsData = movies.filter((m) => !m.mpaa_rating || !m.creator || !m.poster_url || !m.genre)
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
          const [creditsData, ratingData, genreData] = await Promise.all([
            !movie.creator ? getMovieCredits(match.id) : Promise.resolve({ director: null }),
            !movie.mpaa_rating ? getMovieRating(match.id) : Promise.resolve({ mpaa_rating: null }),
            !movie.genre ? getMovieGenre(match.id) : Promise.resolve({ genre: null })
          ])

          const updates: Partial<{ creator: string; poster_url: string; mpaa_rating: string; genre: string }> = {}
          if (!movie.creator && creditsData.director) updates.creator = creditsData.director
          if (!movie.poster_url && match.poster_path) updates.poster_url = getPosterUrl(match.poster_path)
          if (!movie.mpaa_rating && ratingData.mpaa_rating) updates.mpaa_rating = ratingData.mpaa_rating
          if (!movie.genre && genreData.genre) updates.genre = genreData.genre

          if (Object.keys(updates).length > 0) {
            await supabase.from('media_items').update(updates).eq('id', movie.id)
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

  async function handleClearLibrary() {
    setClearing(true)
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) { setClearing(false); return }

    const { data: userMovies } = await supabase.from('media_items').select('id').eq('user_id', user.id)
    if (userMovies && userMovies.length > 0) {
      const ids = userMovies.map((m: { id: string }) => m.id)
      await supabase.from('movie_labels').delete().in('item_id', ids)
      await supabase.from('media_items').delete().eq('user_id', user.id)
    }

    setClearing(false)
    setClearConfirm(false)
    onClearLibrary()
    onClose()
  }

  async function handleSave() {
    setSaving(true)
    const { data: authData } = await supabase.auth.getUser()
    const existing = authData.user?.user_metadata?.settings || {}
    const settings: UserSettings = { nightMode }
    await supabase.auth.updateUser({ data: { settings: { ...existing, ...settings } } })
    onSave(settings)
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,0.4)] flex items-center justify-center z-300"
      onClick={onClose}
    >
      <div
        className="bg-white border border-powder-blue rounded p-8 w-90 max-w-[90vw] max-h-[90vh] overflow-y-auto shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`${sectionHeadingStyle} mb-6`}>Settings</h2>

        {/* Mann Mode */}
        <div className="mb-6">
          <div className={`${fieldLabelStyle} mb-2`}>Mann Mode</div>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', minHeight: '44px' }}
          >
            <div
              onClick={() => setNightMode((v) => !v)}
              style={{
                position: 'relative',
                width: '48px',
                height: '28px',
                borderRadius: '14px',
                backgroundColor: nightMode ? 'var(--color-mint)' : 'var(--color-powder-blue)',
                transition: 'background-color 0.2s',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: nightMode ? '23px' : '3px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </div>
            <span className="text-sm text-navy font-serif">
              {nightMode ? 'On' : 'Off'}
            </span>
          </label>
        </div>

        {/* Shelf Data */}
        <div className="mb-6 pt-6 border-t border-powder-blue">
          <div className={`${fieldLabelStyle} mb-2`}>Shelf Data</div>
          <p className="text-[0.8rem] text-warm-gray mt-0 mb-3">
            Fill in missing TMDB data (poster, director, MPAA rating, genre) for all movies in your shelf.
          </p>
          <button
            onClick={handleRefreshTMDB}
            disabled={refreshState === 'running'}
            className={`border-none px-4 py-1.5 cursor-pointer font-serif text-sm text-navy rounded-sm ${refreshState === 'running' ? 'bg-warm-gray opacity-70 cursor-default' : 'bg-powder-blue'}`}
          >
            {refreshState === 'running' ? 'Refreshing…' : 'Refresh TMDB Data'}
          </button>

          {refreshProgress && refreshState === 'running' && (
            <div className="mt-3">
              <div className="flex justify-between text-[0.75rem] text-warm-gray mb-1">
                <span>Processing…</span>
                <span>{refreshProgress.current} / {refreshProgress.total}</span>
              </div>
              <div className="w-full h-1.5 bg-powder-blue rounded-full overflow-hidden">
                <div
                  className="h-full bg-mint rounded-full transition-[width] duration-300 ease-in-out"
                  style={{ width: `${refreshProgress.total > 0 ? (refreshProgress.current / refreshProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {refreshSummary && refreshState === 'done' && (
            <div className="mt-3 text-[0.8rem] text-warm-gray">
              <p className="mt-0 mb-2">
                Done — {refreshSummary.updated} updated · {refreshSummary.skipped} already complete
                {refreshSummary.notFound.length > 0 && ` · ${refreshSummary.notFound.length} not found on TMDB`}
              </p>
              {refreshSummary.notFound.length > 0 && (
                <div className="bg-cream border border-powder-blue rounded p-3 max-h-30 overflow-y-auto">
                  <div className="italic mb-1">Not found on TMDB:</div>
                  {refreshSummary.notFound.map((title, i) => (
                    <div key={i} className="text-navy text-[0.75rem] pl-2">{title}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="mb-6 pt-6 border-t border-powder-blue">
          <div className={`${fieldLabelStyle} mb-2`}>Danger Zone</div>
          {!clearConfirm ? (
            <button
              onClick={() => setClearConfirm(true)}
              disabled={movies.length === 0}
              className={`border border-dusty-rose text-dusty-rose bg-transparent px-4 py-1.5 font-serif text-sm rounded-sm ${movies.length === 0 ? 'opacity-40 cursor-default' : 'cursor-pointer'}`}
            >
              Clear Library
            </button>
          ) : (
            <div className="bg-white border border-dusty-rose rounded p-4">
              <p className="text-sm text-navy mt-0 mb-3">
                This will permanently delete all <strong>{movies.length}</strong> movie{movies.length !== 1 ? 's' : ''} from your shelf. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setClearConfirm(false)}
                  className="border border-warm-gray text-warm-gray bg-transparent px-4 py-1.5 cursor-pointer font-serif text-sm rounded-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearLibrary}
                  disabled={clearing}
                  className={`border-none text-white bg-dusty-rose px-4 py-1.5 font-serif text-sm rounded-sm ${clearing ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                >
                  {clearing ? 'Clearing…' : 'Yes, delete all'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-8">
          <button
            onClick={onClose}
            className="bg-transparent border border-powder-blue px-4 py-1.5 cursor-pointer font-serif text-sm text-warm-gray rounded-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`border border-powder-blue px-4 py-1.5 font-serif text-sm text-navy rounded-sm bg-powder-blue ${saving ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
