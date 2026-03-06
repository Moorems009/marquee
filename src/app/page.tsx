import { supabase } from '@/lib/supabase'

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
      {movies.length === 0 ? (
        <p>No movies yet. Add some!</p>
      ) : (
        <ul>
          {movies.map((movie) => (
            <li key={movie.id}>{movie.title}</li>
          ))}
        </ul>
      )}
    </main>
  )
}