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

  function openEdit(movie: Movie) {
    setEditMovie(movie)
    setEditData({ ...movie })
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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid var(--powder-blue)',
        paddingBottom: '1rem',
        marginBottom: '2rem',
        position: 'relative'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontStyle: 'italic',
          color: 'var(--navy)',
          margin: 0
        }}>Marquee</h1>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSettingsMenu((prev) => !prev)}
            style={{
              background: 'none',
              border: '1px solid var(--powder-blue)',
              color: 'var(--navy)',
              padding: '0.4rem 0.75rem',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              borderRadius: '2px',
              fontSize: '1.1rem',
              lineHeight: 1
            }}
          >
            ⚙
          </button>

          {showSettingsMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 0.5rem)',
                right: 0,
                backgroundColor: 'white',
                border: '1px solid var(--powder-blue)',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 200,
                minWidth: '180px',
                overflow: 'hidden'
              }}
            >
              <div style={{
                padding: '0.6rem 1rem',
                borderBottom: '1px solid var(--powder-blue)',
                fontSize: '0.75rem',
                color: 'var(--warm-gray)',
                fontStyle: 'italic'
              }}>
                {userEmail}
              </div>
              <button
                onClick={() => { setShowSettingsMenu(false); setShowSettingsModal(true) }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--powder-blue)',
                  padding: '0.6rem 1rem',
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                  fontSize: '0.875rem',
                  color: 'var(--navy)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--cream)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
              >
                Settings
              </button>
              <button
                onClick={() => { setShowSettingsMenu(false); setShowImportModal(true) }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--powder-blue)',
                  padding: '0.6rem 1rem',
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                  fontSize: '0.875rem',
                  color: 'var(--navy)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--cream)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
              >
                Import CSV
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: '0.6rem 1rem',
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                  fontSize: '0.875rem',
                  color: 'var(--dusty-rose)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--cream)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
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
            onClose={() => setShowSettingsModal(false)}
            onSave={(settings) => setViewMode(settings.defaultView)}
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