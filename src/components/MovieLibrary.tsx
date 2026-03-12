'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useMovies } from '@/hooks/useMovies'
import { useLabels } from '@/hooks/useLabels'
import { Movie, Label } from '@/lib/types'
import MovieList from './MovieList'
import EditMovieModal from './EditMovieModal'
import ManageLabelModal from './ManageLabelModal'
import ImportCSVModal from './ImportCSVModal'
import SettingsModal from './SettingsModal'
import NowPlayingMarquee from './NowPlayingMarquee'
import ErrorBoundary from './ErrorBoundary'

export default function MovieLibrary() {
  const supabase = createClient()
  const router = useRouter()
  const { movies, loading, fetchMovies, updateMovie, deleteMovie } = useMovies()
  const { labels, movieLabels, labelItems, fetchLabels, fetchMovieLabels, createLabel, addLabelToMovie, removeLabelFromMovie, updateLabelItemPositions, updateLabelSection } = useLabels()
  const [userEmail, setUserEmail] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [editMovie, setEditMovie] = useState<Movie | null>(null)
  const [editData, setEditData] = useState<Partial<Movie>>({})
  const [editMovieLabels, setEditMovieLabels] = useState<Label[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [manageLabelId, setManageLabelId] = useState<string | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [nightMode, setNightMode] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [nowPlayingIds, setNowPlayingIds] = useState<string[]>([])

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser()
      setUserEmail(authData.user?.email || '')
      const saved = authData.user?.user_metadata?.settings
      if (saved?.defaultView === 'grid' || saved?.defaultView === 'list') setViewMode(saved.defaultView)
      if (saved?.nightMode === true) setNightMode(true)
      if (!saved?.hasSeenWelcome) setShowWelcome(true)
      if (Array.isArray(saved?.nowPlaying)) setNowPlayingIds(saved.nowPlaying)
      fetchMovies()
      fetchLabels()
      fetchMovieLabels()
    }
    init()
  }, [])

  async function handleViewModeChange(mode: 'list' | 'grid') {
    setViewMode(mode)
    const { data: authData } = await supabase.auth.getUser()
    const existing = authData.user?.user_metadata?.settings || {}
    await supabase.auth.updateUser({ data: { settings: { ...existing, defaultView: mode } } })
  }

  async function dismissWelcome() {
    setShowWelcome(false)
    const { data: authData } = await supabase.auth.getUser()
    const existing = authData.user?.user_metadata?.settings || {}
    await supabase.auth.updateUser({ data: { settings: { ...existing, hasSeenWelcome: true } } })
  }

  async function persistNowPlaying(ids: string[]) {
    const { data: authData } = await supabase.auth.getUser()
    const existing = authData.user?.user_metadata?.settings || {}
    await supabase.auth.updateUser({ data: { settings: { ...existing, nowPlaying: ids } } })
    setNowPlayingIds(ids)
  }

  async function handleShuffle(picked: string[]) {
    await persistNowPlaying(picked)
  }

  async function handleToggleNowPlaying(movieId: string) {
    const { data: authData } = await supabase.auth.getUser()
    const existing = authData.user?.user_metadata?.settings || {}
    const current: string[] = existing.nowPlaying || []
    const updated = current.includes(movieId)
      ? current.filter((id: string) => id !== movieId)
      : current.length < 3
      ? [...current, movieId]
      : current
    await supabase.auth.updateUser({ data: { settings: { ...existing, nowPlaying: updated } } })
    setNowPlayingIds(updated)
  }

  const VALID_FORMATS = ['4K', 'Blu-ray', 'DVD', 'VHS', 'Digital']

  function openEdit(movie: Movie) {
    setEditMovie(movie)
    setEditData({
      ...movie,
      format: VALID_FORMATS.includes(movie.format) ? movie.format : 'Blu-ray'
    })
    setEditMovieLabels(movieLabels[movie.id] || [])
  }

  function closeEdit() {
    setEditMovie(null)
    setEditData({})
    setEditMovieLabels([])
  }

  async function handleSave(updates: Partial<Movie>, newLabelName: string) {
    if (!editMovie) return

    await updateMovie(editMovie.id, updates)

    if (newLabelName.trim().length > 0) {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      const { data: newLabel } = await createLabel(newLabelName.trim(), user?.id || '')
      if (newLabel) {
        await addLabelToMovie(editMovie.id, { id: newLabel.id, name: newLabel.name, is_section: false })
      }
    }

    closeEdit()
  }

  async function handleDelete() {
    if (!editMovie) return
    await deleteMovie(editMovie.id)
    closeEdit()
  }

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/auth')
  }

  return (
    <div className={`min-h-screen bg-cream ${nightMode ? 'night' : ''}`}>
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-8 md:py-8">

      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-powder-blue pb-4 mb-8 relative">
        <h1 className="text-4xl italic text-navy m-0">Marquee</h1>

        <div className="relative">
          <button
            onClick={() => setShowSettingsMenu((prev) => !prev)}
            className="bg-transparent border border-powder-blue text-navy px-3 py-1.5 cursor-pointer font-serif rounded-sm text-[1.1rem] leading-none"
          >
            ⚙
          </button>

          {showSettingsMenu && (
            <div className="absolute top-[calc(100%+0.5rem)] right-0 bg-white border border-powder-blue rounded shadow-lg z-200 min-w-45 overflow-hidden">
              <div className="px-4 py-2 border-b border-powder-blue text-xs text-warm-gray italic">
                {userEmail}
              </div>
              <button
                onClick={() => { setShowSettingsMenu(false); setShowSettingsModal(true) }}
                className="block w-full text-left bg-transparent border-none border-b border-powder-blue px-4 py-2 cursor-pointer font-serif text-sm text-navy hover:bg-cream"
              >
                Settings
              </button>
              <button
                onClick={() => { setShowSettingsMenu(false); setShowImportModal(true) }}
                className="block w-full text-left bg-transparent border-none border-b border-powder-blue px-4 py-2 cursor-pointer font-serif text-sm text-navy hover:bg-cream"
              >
                Import CSV
              </button>
              <button
                onClick={handleSignOut}
                className="block w-full text-left bg-transparent border-none px-4 py-2 cursor-pointer font-serif text-sm text-dusty-rose hover:bg-cream"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {showWelcome && (
        <div className="bg-white border border-powder-blue rounded p-6 mb-8 relative">
          <button
            onClick={dismissWelcome}
            className="absolute top-3 right-4 bg-transparent border-none text-warm-gray cursor-pointer font-serif text-lg leading-none"
          >
            ×
          </button>
          <h2 className="text-dusty-rose uppercase tracking-widest text-sm m-0 mb-3">Welcome to Marquee</h2>
          <p className="text-navy text-sm m-0 mb-2">
            Your personal physical media shelf. Start by adding a movie below, or import an existing collection all at once.
          </p>
          <p className="text-warm-gray text-sm m-0 mb-4 italic">
            Once you have movies, open any title and click <span className="font-bold not-italic text-navy">Now Playing</span> to feature it on the marquee above.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={dismissWelcome}
              className="bg-powder-blue text-navy border-none px-4 py-1.5 cursor-pointer font-serif text-sm rounded-sm"
            >
              Add a movie ↓
            </button>
            <button
              onClick={() => { dismissWelcome(); setShowImportModal(true) }}
              className="bg-transparent border border-powder-blue text-navy px-4 py-1.5 cursor-pointer font-serif text-sm rounded-sm"
            >
              Import CSV
            </button>
          </div>
        </div>
      )}

      <NowPlayingMarquee movies={movies} nowPlayingIds={nowPlayingIds} nightMode={nightMode} onClear={() => persistNowPlaying([])} />

      <ErrorBoundary>
        <MovieList
          movies={movies}
          labels={labels}
          loading={loading}
          viewMode={viewMode}
          movieLabels={movieLabels}
          labelItems={labelItems}
          onEdit={openEdit}
          onViewModeChange={handleViewModeChange}
          onShuffle={handleShuffle}
          onManageLabel={(id) => setManageLabelId(id)}
          onMovieAdded={async (newId: string) => {
            await fetchMovies()
            if (nowPlayingIds.length < 3) {
              await persistNowPlaying([...nowPlayingIds, newId])
            }
          }}
        />
      </ErrorBoundary>

      {editMovie && (
        <ErrorBoundary onReset={closeEdit}>
          <EditMovieModal
            movie={editMovie}
            editData={editData}
            editMovieLabels={editMovieLabels}
            labels={labels}
            nowPlayingIds={nowPlayingIds}
            onClose={closeEdit}
            onSave={handleSave}
            onDelete={handleDelete}
            onToggleNowPlaying={handleToggleNowPlaying}
            onSelectExistingLabel={async (label) => {
              if (editMovieLabels.some((l) => String(l.id) === String(label.id))) return
              await addLabelToMovie(editMovie.id, label)
              setEditMovieLabels([...editMovieLabels, label])
            }}
            onRemoveLabel={async (label) => {
              await removeLabelFromMovie(editMovie.id, label.id)
              setEditMovieLabels(editMovieLabels.filter((l) => l.id !== label.id))
            }}
            setEditData={setEditData}
          />
        </ErrorBoundary>
      )}
      {showSettingsModal && (
        <ErrorBoundary onReset={() => setShowSettingsModal(false)}>
          <SettingsModal
            currentSettings={{ nightMode }}
            movies={movies}
            onClose={() => setShowSettingsModal(false)}
            onSave={(settings) => setNightMode(settings.nightMode)}
            onRefreshComplete={fetchMovies}
          onClearLibrary={async () => { await persistNowPlaying([]); fetchMovies(); fetchMovieLabels() }}
          />
        </ErrorBoundary>
      )}
      {showImportModal && (
        <ErrorBoundary onReset={() => setShowImportModal(false)}>
          <ImportCSVModal
            existingMovies={movies}
            onClose={() => setShowImportModal(false)}
            onImportComplete={async (importedIds: string[]) => {
              await fetchMovies()
              fetchMovieLabels()
              setShowImportModal(false)
              if (nowPlayingIds.length < 3 && importedIds.length > 0) {
                const slots = 3 - nowPlayingIds.length
                const shuffled = [...importedIds].sort(() => Math.random() - 0.5)
                await persistNowPlaying([...nowPlayingIds, ...shuffled.slice(0, slots)])
              }
            }}
          />
        </ErrorBoundary>
      )}
      {manageLabelId && (() => {
        const label = labels.find(l => l.id === manageLabelId)
        if (!label) return null
        const entries = labelItems[manageLabelId] || []
        const orderedMovies = entries
          .map(e => movies.find(m => m.id === e.itemId))
          .filter((m): m is Movie => !!m)
        return (
          <ErrorBoundary onReset={() => setManageLabelId(null)}>
            <ManageLabelModal
              label={label}
              orderedMovies={orderedMovies}
              onClose={() => setManageLabelId(null)}
              onSave={async (positions, isSection) => {
                await updateLabelItemPositions(manageLabelId, positions)
                await updateLabelSection(manageLabelId, isSection)
              }}
            />
          </ErrorBoundary>
        )
      })()}
    </div>
    </div>
  )
}
