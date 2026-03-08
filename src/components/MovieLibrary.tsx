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

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser()
      setUserEmail(authData.user?.email || '')
      const savedView = authData.user?.user_metadata?.settings?.defaultView
      if (savedView === 'grid' || savedView === 'list') setViewMode(savedView)
      fetchMovies()
      fetchLabels()
      fetchMovieLabels()
    }
    init()
  }, [])

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
            <div className="absolute top-[calc(100%+0.5rem)] right-0 bg-white border border-powder-blue rounded shadow-lg z-[200] min-w-[180px] overflow-hidden">
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

      <ErrorBoundary>
        <AddMovieForm onMovieAdded={fetchMovies} />
      </ErrorBoundary>

      <ErrorBoundary>
        <MovieList
          movies={movies}
          labels={labels}
          loading={loading}
          viewMode={viewMode}
          movieLabels={movieLabels}
          onEdit={openEdit}
          onViewModeChange={setViewMode}
        />
      </ErrorBoundary>

      {editMovie && (
        <ErrorBoundary onReset={closeEdit}>
          <EditMovieModal
            movie={editMovie}
            editData={editData}
            editMovieLabels={editMovieLabels}
            labels={labels}
            onClose={closeEdit}
            onSave={handleSave}
            onDelete={handleDelete}
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
            currentSettings={{ defaultView: viewMode }}
            movies={movies}
            onClose={() => setShowSettingsModal(false)}
            onSave={(settings) => setViewMode(settings.defaultView)}
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
  )
}
