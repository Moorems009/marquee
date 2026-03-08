'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useMovies } from '@/hooks/useMovies'
import { useLabels } from '@/hooks/useLabels'
import { Movie, Label } from '@/lib/types'
import AddMovieForm from './AddMovieForm'
import MovieList from './MovieList'
import EditMovieModal from './EditMovieModal'
import ImportCSVModal from './ImportCSVModal'
import SettingsModal from './SettingsModal'
import NowPlayingMarquee from './NowPlayingMarquee'
import ErrorBoundary from './ErrorBoundary'

export default function MovieLibrary() {
  const supabase = createClient()
  const router = useRouter()
  const { movies, loading, fetchMovies, updateMovie, deleteMovie } = useMovies()
  const { labels, movieLabels, fetchLabels, fetchMovieLabels, createLabel, addLabelToMovie, removeLabelFromMovie } = useLabels()
  const [userEmail, setUserEmail] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [editMovie, setEditMovie] = useState<Movie | null>(null)
  const [editData, setEditData] = useState<Partial<Movie>>({})
  const [editMovieLabels, setEditMovieLabels] = useState<Label[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [nightMode, setNightMode] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [nowPlayingIds, setNowPlayingIds] = useState<string[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

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
        await addLabelToMovie(editMovie.id, newLabel.id)
      }
    }

    await fetchMovieLabels()
    closeEdit()
  }

  async function handleDelete() {
    if (!editMovie) return
    await deleteMovie(editMovie.id)
    await fetchMovieLabels()
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
              onClick={() => { dismissWelcome(); setShowAddForm(true) }}
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

      <NowPlayingMarquee movies={movies} nowPlayingIds={nowPlayingIds} />

      <div className="mb-8">
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-2 bg-transparent border border-powder-blue text-navy px-4 py-1.5 cursor-pointer font-serif text-sm rounded-sm"
        >
          <span>{showAddForm ? '−' : '+'}</span> Add a movie
        </button>
        {showAddForm && (
          <div className="mt-3">
            <ErrorBoundary>
              <AddMovieForm
                movies={movies}
                onMovieAdded={() => {
                  fetchMovies()
                  setShowAddForm(true)
                }}
              />
            </ErrorBoundary>
          </div>
        )}
      </div>

      <ErrorBoundary>
        <MovieList
          movies={movies}
          labels={labels}
          loading={loading}
          viewMode={viewMode}
          movieLabels={movieLabels}
          onEdit={openEdit}
          onViewModeChange={handleViewModeChange}
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
              await addLabelToMovie(editMovie.id, label.id)
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
          />
        </ErrorBoundary>
      )}
      {showImportModal && (
        <ErrorBoundary onReset={() => setShowImportModal(false)}>
          <ImportCSVModal
            existingMovies={movies}
            onClose={() => setShowImportModal(false)}
            onImportComplete={() => {
              fetchMovies()
              fetchMovieLabels()
              setShowImportModal(false)
            }}
          />
        </ErrorBoundary>
      )}
    </div>
    </div>
  )
}
