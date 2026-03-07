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

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser()
      setUserEmail(authData.user?.email || '')
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
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '2.5rem',
            fontStyle: 'italic',
            color: 'var(--navy)',
            margin: 0
          }}>Marquee</h1>
          <p style={{ color: 'var(--warm-gray)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
            {userEmail}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: '1px solid var(--warm-gray)',
            color: 'var(--warm-gray)',
            padding: '0.4rem 1rem',
            cursor: 'pointer',
            fontFamily: 'Georgia, serif',
            borderRadius: '2px'
          }}
        >
          Sign Out
        </button>
      </div>

      <AddMovieForm onMovieAdded={fetchMovies} />

      <MovieList
        movies={movies}
        loading={loading}
        viewMode={viewMode}
        movieLabels={movieLabels}
        onEdit={openEdit}
        onViewModeChange={setViewMode}
      />

      {editMovie && (
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
      )}
    </div>
  )
}