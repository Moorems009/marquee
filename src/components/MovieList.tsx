'use client'

import { Movie, Label } from '@/lib/types'
import { sectionHeadingStyle } from '@/lib/styles'

type Props = {
  movies: Movie[]
  loading: boolean
  viewMode: 'list' | 'grid'
  movieLabels: Record<string, Label[]>
  onEdit: (movie: Movie) => void
  onViewModeChange: (mode: 'list' | 'grid') => void
}

export default function MovieList({
  movies,
  loading,
  viewMode,
  movieLabels,
  onEdit,
  onViewModeChange
}: Props) {
  const viewBtnClass = (active: boolean) =>
    `border border-powder-blue text-navy py-1 px-3 cursor-pointer font-serif rounded-sm text-[0.8rem] ${active ? 'bg-powder-blue' : 'bg-white'}`

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className={sectionHeadingStyle}>My Library</h2>
        <div className="flex gap-2">
          <button onClick={() => onViewModeChange('list')} className={viewBtnClass(viewMode === 'list')}>
            ☰ List
          </button>
          <button onClick={() => onViewModeChange('grid')} className={viewBtnClass(viewMode === 'grid')}>
            ⊞ Grid
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-warm-gray">Loading...</p>
      ) : movies.length === 0 ? (
        <p className="text-warm-gray italic">No movies yet. Add some!</p>
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-2">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="flex justify-between items-center py-3 px-4 bg-white border border-powder-blue border-l-4 border-l-blush rounded"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {movie.poster_url && (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-8 h-12 object-cover rounded-sm flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <span className="font-bold text-navy">{movie.title}</span>
                  <span className="text-warm-gray ml-2 text-sm">({movie.year})</span>
                  {movie.director && (
                    <span className="text-warm-gray ml-2 text-sm">— {movie.director}</span>
                  )}
                  {movie.genre && (
                    <div className="text-xs text-warm-gray italic mt-0.5">{movie.genre}</div>
                  )}
                  {movieLabels[movie.id]?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {movieLabels[movie.id].map((label) => (
                        <span
                          key={label.id}
                          className="bg-butter text-navy px-2 py-0.5 rounded-full text-[0.7rem] font-serif"
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3 flex-wrap justify-end">
                <span className="text-xs uppercase tracking-wide text-white bg-mint px-2 py-0.5 rounded-sm whitespace-nowrap">
                  {movie.format}
                </span>
                {movie.imprint && (
                  <span className="text-xs italic text-navy bg-powder-blue px-2 py-0.5 rounded-sm whitespace-nowrap">
                    {movie.imprint}
                  </span>
                )}
                {movie.mpaa_rating && (
                  <span className="text-xs text-navy border border-warm-gray px-2 py-0.5 rounded-sm whitespace-nowrap font-serif">
                    {movie.mpaa_rating}
                  </span>
                )}
                <button
                  onClick={() => onEdit(movie)}
                  className="bg-transparent border border-powder-blue text-warm-gray px-2 py-0.5 cursor-pointer font-serif rounded-sm text-xs"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {movies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => onEdit(movie)}
              className="cursor-pointer rounded overflow-hidden border border-powder-blue bg-white transition-transform duration-100 hover:scale-[1.03]"
            >
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full object-cover block"
                  style={{ aspectRatio: '2/3' }}
                />
              ) : (
                <div
                  className="w-full bg-cream flex items-center justify-center p-2 text-center"
                  style={{ aspectRatio: '2/3' }}
                >
                  <span className="text-[0.8rem] text-warm-gray italic">{movie.title}</span>
                </div>
              )}
              <div className="p-2">
                <div className="text-[0.75rem] font-bold text-navy mb-0.5">{movie.title}</div>
                <span className="text-[0.65rem] uppercase text-white bg-mint px-1.5 py-0.5 rounded-sm inline-block">
                  {movie.format}
                </span>
                {movie.imprint && (
                  <span className="text-[0.65rem] italic text-navy bg-powder-blue px-1.5 py-0.5 rounded-sm inline-block ml-1">
                    {movie.imprint}
                  </span>
                )}
                {movie.mpaa_rating && (
                  <span className="text-[0.65rem] text-navy border border-warm-gray px-1.5 py-0.5 rounded-sm inline-block ml-1 font-serif">
                    {movie.mpaa_rating}
                  </span>
                )}
                {movie.genre && (
                  <div className="text-[0.65rem] text-warm-gray italic mt-1">{movie.genre}</div>
                )}
                {movieLabels[movie.id]?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {movieLabels[movie.id].map((label) => (
                      <span
                        key={label.id}
                        className="bg-butter text-navy px-1.5 py-0.5 rounded-full text-[0.6rem]"
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
