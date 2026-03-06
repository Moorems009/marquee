'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'



type Movie = {
  id: string
  title: string
  year: number
  format: string
}

export default function MovieLibrary() {
const router = useRouter()
const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [format, setFormat] = useState('Blu-ray')
  const [message, setMessage] = useState('')

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
  async function handleSignOut() {
 await supabase.auth.signOut({ scope: 'local' })
  router.push('/auth')
}

  useEffect(() => {
    fetchMovies()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('movies')
      .insert([{ title, year: parseInt(year), format, user_id: user?.id }])

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Movie added!')
      setTitle('')
      setYear('')
      setFormat('Blu-ray')
      fetchMovies()
    }
  }

  return (
    <div>
    <p>Signed in as: {userEmail}</p>
      <button onClick={handleSignOut}>Sign Out</button> 
      <h2>Add a Movie</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option>Blu-ray</option>
            <option>4K UHD</option>
            <option>DVD</option>
            <option>VHS</option>
            <option>Digital</option>
          </select>
        </div>
        <button type="submit">Add Movie</button>
      </form>
      {message && <p>{message}</p>}

      <h2>My Library</h2>
      {loading ? (
        <p>Loading...</p>
      ) : movies.length === 0 ? (
        <p>No movies yet. Add some!</p>
      ) : (
        <ul>
          {movies.map((movie) => (
            <li key={movie.id}>
              {movie.title} ({movie.year}) — {movie.format}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}