'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AddMovieForm() {
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [format, setFormat] = useState('Blu-ray')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('movies')
      .insert([{ title, year: parseInt(year), format }])

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Movie added!')
      setTitle('')
      setYear('')
      setFormat('Blu-ray')
    }

    setLoading(false)
  }

  return (
    <div>
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
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Movie'}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}