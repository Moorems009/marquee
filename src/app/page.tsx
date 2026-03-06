import { supabase } from '@/lib/supabase'
import AddMovieForm from '@/components/AddMovieForm'

export default async function Home() {
  const { data: movies, error } = await supabase
    .from('movies')
    .select('*')

  if (error) {
    return <div>Error: {error.message}</div>
  }

  return (
    <main>
      <h1>Marquee</h1>
      <AddMovieForm />
      {movies.length === 0 ? (
        <p>No movies yet. Add some!</p>
      ) : (
        <ul>
          {movies.map((movie) => (
            <li key={movie.id}>{movie.title} ({movie.year}) — {movie.format}</li>
          ))}
        </ul>
      )}
    </main>
  )
}