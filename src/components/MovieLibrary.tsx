'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Movie = {
  id: string
  title: string
  year: number
  format: string
  imprint: string | null
  director: string | null
}

export default function MovieLibrary() {
  const supabase = createClient()
  const router = useRouter()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [format, setFormat] = useState('Blu-ray')
  const [imprint, setImprint] = useState('')
  const [director, setDirector] = useState('')
  const [message, setMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [editMovie, setEditMovie] = useState<Movie | null>(null)
  const [editData, setEditData] = useState<Partial<Movie>>({})

  async function fetchMovies() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    setUserEmail(user?.email || '')

    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('user_id', user?.id)
      .order('title', { ascending: true })

    if (!error && data) setMovies(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchMovies()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    const { error } = await supabase
      .from('movies')
      .insert([{ title, year: parseInt(year), format, imprint, director, user_id: user?.id }])

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Movie added!')
      setTitle('')
      setYear('')
      setFormat('Blu-ray')
      setImprint('')
      setDirector('')
      fetchMovies()
    }
  }

  function openEdit(movie: Movie) {
    setEditMovie(movie)
    setEditData({ ...movie })
  }

  function closeEdit() {
    setEditMovie(null)
    setEditData({})
  }

  async function handleSave() {
    if (!editMovie) return

    const { error } = await supabase
      .from('movies')
      .update({
        title: editData.title,
        year: editData.year,
        format: editData.format,
        director: editData.director,
        imprint: editData.imprint,
      })
      .eq('id', editMovie.id)

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      closeEdit()
      fetchMovies()
    }
  }

  async function handleDelete() {
    if (!editMovie) return

    const { error } = await supabase
      .from('movies')
      .delete()
      .eq('id', editMovie.id)

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      closeEdit()
      fetchMovies()
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/auth')
  }

  const inputStyle = {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--powder-blue)',
    borderRadius: '2px',
    fontFamily: 'Georgia, serif',
    backgroundColor: 'var(--cream)',
    color: 'var(--navy)',
    width: '100%',
    boxSizing: 'border-box' as const
  }

  const labelStyle = {
    fontSize: '0.75rem',
    color: 'var(--warm-gray)',
    display: 'block' as const,
    marginBottom: '0.25rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>

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

      {/* Add Movie Form */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid var(--powder-blue)',
        borderRadius: '4px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.1rem',
          color: 'var(--dusty-rose)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>Add to your library</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ ...inputStyle, flex: '3', minWidth: '160px', width: 'auto' }}
            />
            <input
              type="text"
              placeholder="Director"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
              style={{ ...inputStyle, flex: '2', minWidth: '140px', width: 'auto' }}
            />
            <input
              type="number"
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
              style={{ ...inputStyle, flex: '1', minWidth: '80px', width: 'auto' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              style={{ ...inputStyle, flex: '1', minWidth: '100px', width: 'auto' }}
            >
              <option>Blu-ray</option>
              <option>4K UHD</option>
              <option>4K</option>
              <option>DVD</option>
              <option>VHS</option>
              <option>Digital</option>
            </select>
            <input
              type="text"
              placeholder="Imprint (e.g. Criterion, Arrow)"
              value={imprint}
              onChange={(e) => setImprint(e.target.value)}
              style={{ ...inputStyle, flex: '3', minWidth: '160px', width: 'auto' }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--powder-blue)',
                color: 'var(--navy)',
                border: 'none',
                padding: '0.5rem 1.5rem',
                cursor: 'pointer',
                fontFamily: 'Georgia, serif',
                borderRadius: '2px',
                fontWeight: 'bold'
              }}
            >
              Add
            </button>
          </div>
        </form>
        {message && (
          <p style={{ margin: '0.75rem 0 0 0', color: 'var(--dusty-rose)', fontSize: '0.875rem' }}>
            {message}
          </p>
        )}
      </div>

      {/* Movie List */}
      <div>
        <h2 style={{
          fontSize: '1.1rem',
          color: 'var(--dusty-rose)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '1rem'
        }}>My Library</h2>
        {loading ? (
          <p style={{ color: 'var(--warm-gray)' }}>Loading...</p>
        ) : movies.length === 0 ? (
          <p style={{ color: 'var(--warm-gray)', fontStyle: 'italic' }}>No movies yet. Add some!</p>
        ) : (
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
                  border: '1px solid var(--powder-blue)',
                  borderRadius: '4px',
                  borderLeft: '4px solid var(--blush)'
                }}
              >
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
                  {movie.imprint && (
                    <span style={{ color: 'var(--warm-gray)', marginLeft: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic' }}>
                      [{movie.imprint}]
                    </span>
                  )}
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
                  <button
                    onClick={() => openEdit(movie)}
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
        )}
      </div>

      {/* Edit Modal */}
      {editMovie && (
        <div
          onClick={closeEdit}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(44, 62, 107, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--cream)',
              border: '1px solid var(--powder-blue)',
              borderRadius: '4px',
              padding: '2rem',
              width: '100%',
              maxWidth: '500px',
              margin: '1rem'
            }}
          >
            <h2 style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.1rem',
              color: 'var(--dusty-rose)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>Edit Movie</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Director</label>
                <input
                  type="text"
                  value={editData.director || ''}
                  onChange={(e) => setEditData({ ...editData, director: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Year</label>
                <input
                  type="number"
                  value={editData.year || ''}
                  onChange={(e) => setEditData({ ...editData, year: parseInt(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Format</label>
                <select
                  value={editData.format || 'Blu-ray'}
                  onChange={(e) => setEditData({ ...editData, format: e.target.value })}
                  style={inputStyle}
                >
                  <option>Blu-ray</option>
                  <option>4K UHD</option>
                  <option>4K</option>
                  <option>DVD</option>
                  <option>VHS</option>
                  <option>Digital</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Imprint</label>
                <input
                  type="text"
                  value={editData.imprint || ''}
                  onChange={(e) => setEditData({ ...editData, imprint: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button
                onClick={handleDelete}
                style={{
                  backgroundColor: 'white',
                  color: 'var(--dusty-rose)',
                  border: '1px solid var(--dusty-rose)',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                  borderRadius: '2px',
                  fontSize: '0.875rem'
                }}
              >
                Delete
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={closeEdit}
                  style={{
                    backgroundColor: 'white',
                    color: 'var(--warm-gray)',
                    border: '1px solid var(--warm-gray)',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    fontFamily: 'Georgia, serif',
                    borderRadius: '2px',
                    fontSize: '0.875rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    backgroundColor: 'var(--powder-blue)',
                    color: 'var(--navy)',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    fontFamily: 'Georgia, serif',
                    borderRadius: '2px',
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}