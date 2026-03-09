'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { searchMovies, getMovieCredits, getMovieRating, getMovieGenre, getPosterUrl } from '@/lib/tmdb'
import { Movie } from '@/lib/types'
import { inputStyle } from '@/lib/styles'

type CSVRow = {
  title: string
  director?: string
  year?: string
  format?: string
  imprint?: string
  labels?: string
}

type ImportStatus = 'pending' | 'duplicate' | 'importing' | 'done' | 'error'

type ImportRow = {
  row: CSVRow
  status: ImportStatus
  message?: string
  warning?: string
}

type Props = {
  existingMovies: Movie[]
  onClose: () => void
  onImportComplete: (importedIds: string[]) => void
}

export default function ImportCSVModal({ existingMovies, onClose, onImportComplete }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [isParsed, setIsParsed] = useState(false)
  const [fallbackFormat, setFallbackFormat] = useState('Blu-ray')
  const [isImporting, setIsImporting] = useState(false)
  const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState<number | null>(null)
  const [summary, setSummary] = useState<{ imported: number; skipped: number; errors: number } | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  function normalizeFormat(raw: string): string | null {
    const val = raw.trim().toLowerCase().replace(/[\s\-_.]/g, '')
    if (['4k', '4kuhd', '4kultrahd', 'ultrahd', 'uhd4k'].includes(val)) return '4K'
    if (['bluray', 'blu', 'blueray', 'bray', 'bd'].includes(val)) return 'Blu-ray'
    if (['dvd'].includes(val)) return 'DVD'
    if (['vhs'].includes(val)) return 'VHS'
    if (['digital', 'dig', 'stream', 'streaming'].includes(val)) return 'Digital'
    return null
  }

  function parseCSV(text: string): CSVRow[] {
    function splitCSVLine(line: string): string[] {
      const values: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())
      return values
    }

    const lines = text.trim().split('\n')
    const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''))

    return lines.slice(1).map((line) => {
      const values = splitCSVLine(line)
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] || '' })
      return {
        title: row['title'] || row['name'] || '',
        director: row['director'] || '',
        year: row['year'] || '',
        format: row['format'] || '',
        imprint: row['imprint'] || '',
        labels: row['labels'] || ''
      }
    }).filter((r) => r.title.length > 0)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const parsed = parseCSV(text)
      const importRows: ImportRow[] = parsed.map((row) => {
        const normalizedRowFormat = row.format ? normalizeFormat(row.format) : null
        const isDuplicate = existingMovies.some(
          (m) =>
            m.title.toLowerCase() === row.title.toLowerCase() &&
            String(m.year) === String(row.year) &&
            (normalizedRowFormat ? m.format === normalizedRowFormat : true)
        )
        const formatWarning = !row.format
          ? `No format specified — will use fallback`
          : !normalizeFormat(row.format)
          ? `Unknown format "${row.format}" — will use fallback`
          : undefined

        return {
          row,
          status: isDuplicate ? 'duplicate' : 'pending',
          warning: formatWarning
        }
      })
      setRows(importRows)
      setIsParsed(true)
    }
    reader.readAsText(file)
  }

  async function importRow(importRow: ImportRow): Promise<string | 'error'> {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) return 'error'

    const { row } = importRow
    let director = row.director || ''
    let posterUrl = null
    let mpaaRating: string | null = null
    let genre: string | null = null
    const normalizedFormat = row.format ? normalizeFormat(row.format) : null
    const format = normalizedFormat || fallbackFormat

    try {
      const results = await searchMovies(row.title)
      const match = results.find((r: { title: string; release_date: string }) =>
        r.title.toLowerCase() === row.title.toLowerCase() &&
        (row.year ? r.release_date?.startsWith(row.year) : true)
      ) || results[0]

      if (match) {
        if (match.poster_path) posterUrl = getPosterUrl(match.poster_path)
        const [credits, ratingData, genreData] = await Promise.all([
          !director ? getMovieCredits(match.id) : Promise.resolve({ director: '' }),
          getMovieRating(match.id),
          getMovieGenre(match.id)
        ])
        if (!director) director = credits.director || ''
        mpaaRating = ratingData.mpaa_rating || null
        genre = genreData.genre || null
      }
    } catch {
      // TMDB failed, continue with what we have
    }

    const { data: movieData, error: movieError } = await supabase
      .from('movies')
      .insert([{
        title: row.title,
        year: row.year ? parseInt(row.year) : tmdbYear,
        format,
        imprint: row.imprint || null,
        director: director || null,
        poster_url: posterUrl,
        mpaa_rating: mpaaRating,
        genre,
        user_id: user.id
      }])
      .select()
      .single()

    if (movieError || !movieData) return 'error'

    if (row.labels) {
      const labelNames = row.labels.split(';').map((l) => l.trim()).filter(Boolean)
      for (const name of labelNames) {
        const { data: existingLabel } = await supabase
          .from('labels')
          .select('*')
          .eq('user_id', user.id)
          .ilike('name', name)
          .single()

        let labelId = existingLabel?.id

        if (!labelId) {
          const { data: newLabel } = await supabase
            .from('labels')
            .insert([{ name, user_id: user.id }])
            .select()
            .single()
          labelId = newLabel?.id
        }

        if (labelId) {
          await supabase
            .from('movie_labels')
            .insert([{ movie_id: movieData.id, label_id: labelId }])
        }
      }
    }

    return movieData.id
  }

  async function runImport(rowsToImport: ImportRow[]) {
    setIsImporting(true)
    let imported = 0
    let skipped = 0
    let errors = 0
    const importedIds: string[] = []

    const total = rowsToImport.filter((r) => r.status === 'pending').length
    let current = 0
    setProgress({ current: 0, total })

    const updatedRows = [...rowsToImport]

    for (let i = 0; i < updatedRows.length; i++) {
      if (updatedRows[i].status === 'pending') {
        updatedRows[i] = { ...updatedRows[i], status: 'importing' }
        setRows([...updatedRows])

        const result = await importRow(updatedRows[i])
        current++
        setProgress({ current, total })

        if (result !== 'error') {
          imported++
          importedIds.push(result)
          updatedRows[i] = { ...updatedRows[i], status: 'done' }
        } else {
          errors++
          updatedRows[i] = { ...updatedRows[i], status: 'error', message: 'Failed to import' }
        }
        setRows([...updatedRows])
      } else if (updatedRows[i].status === 'duplicate') {
        skipped++
      }
    }

    setSummary({ imported, skipped, errors })
    setProgress(null)
    setIsImporting(false)
    onImportComplete(importedIds)
  }

  async function handleSkipAll() {
    const updatedRows = rows.map((r) =>
      r.status === 'duplicate' ? { ...r, status: 'done' as ImportStatus, message: 'Skipped' } : r
    )
    setRows(updatedRows)
    setCurrentDuplicateIndex(null)
    await runImport(updatedRows)
  }

  async function handleOverwriteAll() {
    const updatedRows = [...rows]
    for (let i = 0; i < updatedRows.length; i++) {
      if (updatedRows[i].status === 'duplicate') {
        const row = updatedRows[i].row
        const existing = existingMovies.find(
          (m) =>
            m.title.toLowerCase() === row.title.toLowerCase() &&
            String(m.year) === String(row.year)
        )
        if (existing) {
          await supabase.from('movies').delete().eq('id', existing.id)
        }
        updatedRows[i] = { ...updatedRows[i], status: 'pending' }
      }
    }
    setRows(updatedRows)
    setCurrentDuplicateIndex(null)
    await runImport(updatedRows)
  }

  async function handleStartImport() {
    const firstDuplicate = rows.findIndex((r) => r.status === 'duplicate')
    if (firstDuplicate !== -1) {
      setCurrentDuplicateIndex(firstDuplicate)
    } else {
      await runImport(rows)
    }
  }

  async function handleDuplicateChoice(choice: 'skip' | 'overwrite') {
    if (currentDuplicateIndex === null) return

    const updatedRows = [...rows]
    if (choice === 'skip') {
      updatedRows[currentDuplicateIndex] = { ...updatedRows[currentDuplicateIndex], status: 'done', message: 'Skipped' }
    } else {
      const row = updatedRows[currentDuplicateIndex].row
      const existing = existingMovies.find(
        (m) =>
          m.title.toLowerCase() === row.title.toLowerCase() &&
          String(m.year) === String(row.year)
      )
      if (existing) {
        await supabase.from('movies').delete().eq('id', existing.id)
      }
      updatedRows[currentDuplicateIndex] = { ...updatedRows[currentDuplicateIndex], status: 'pending' }
    }

    setRows(updatedRows)

    const nextDuplicate = updatedRows.findIndex((r, i) => i > currentDuplicateIndex && r.status === 'duplicate')
    if (nextDuplicate !== -1) {
      setCurrentDuplicateIndex(nextDuplicate)
    } else {
      setCurrentDuplicateIndex(null)
      await runImport(updatedRows)
    }
  }

  const statusIcon = (status: ImportStatus) => {
    if (status === 'done') return '✓'
    if (status === 'error') return '✗'
    if (status === 'importing') return '…'
    if (status === 'duplicate') return '!'
    return '·'
  }

  const statusClass = (status: ImportStatus) => {
    if (status === 'done') return 'text-mint'
    if (status === 'error') return 'text-dusty-rose'
    if (status === 'importing') return 'text-butter'
    if (status === 'duplicate') return 'text-blush'
    return 'text-warm-gray'
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-[rgba(44,62,107,0.4)] flex items-center justify-center z-1000"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-cream border border-powder-blue rounded p-8 w-full max-w-140 mx-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="mt-0 mb-6 text-[1.1rem] text-dusty-rose uppercase tracking-widest">Import CSV</h2>

        {/* Step 1: File upload */}
        {!isParsed && (
          <div>
            <p className="text-warm-gray text-sm mb-4">
              Upload a CSV with a <strong>Title</strong> column. Optional columns: Director, Year, Format, Imprint, Labels.
              Labels separated by semicolons (e.g. <em>Horror;Criterion</em>).
              Valid formats: <strong>4K, Blu-ray, DVD, VHS, Digital</strong>.
            </p>
            <div className="mb-4">
              <label className="block text-warm-gray text-xs uppercase tracking-wider mb-1">
                Fallback format (for rows with no format)
              </label>
              <select
                value={fallbackFormat}
                onChange={(e) => setFallbackFormat(e.target.value)}
                className={inputStyle}
              >
                <option>Blu-ray</option>
                <option>4K</option>
                <option>DVD</option>
                <option>VHS</option>
                <option>Digital</option>
                <option value="">Leave Blank</option>
              </select>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className={inputStyle}
              style={{ cursor: 'pointer' }}
            />
          </div>
        )}

        {/* Step 2: Duplicate resolution */}
        {currentDuplicateIndex !== null && (
          <div className="bg-white border border-blush rounded p-4 mb-4">
            <p className="text-navy text-sm mb-3 mt-0">
              <strong>{rows[currentDuplicateIndex].row.title}</strong> ({rows[currentDuplicateIndex].row.year}) already exists in your shelf. What would you like to do?
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handleDuplicateChoice('skip')}
                  className="bg-white text-warm-gray border border-warm-gray px-4 py-1.5 cursor-pointer font-serif rounded-sm text-sm"
                >
                  Skip
                </button>
                <button
                  onClick={() => handleDuplicateChoice('overwrite')}
                  className="bg-powder-blue text-navy border-none px-4 py-1.5 cursor-pointer font-serif rounded-sm text-sm font-bold"
                >
                  Overwrite
                </button>
              </div>
              {rows.filter((r) => r.status === 'duplicate').length > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleSkipAll}
                    className="bg-white text-warm-gray border border-warm-gray px-4 py-1 cursor-pointer font-serif rounded-sm text-xs"
                  >
                    Skip all duplicates
                  </button>
                  <button
                    onClick={handleOverwriteAll}
                    className="bg-white text-navy border border-powder-blue px-4 py-1 cursor-pointer font-serif rounded-sm text-xs"
                  >
                    Overwrite all duplicates
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Row preview / progress */}
        {isParsed && rows.length > 0 && (
          <div className="mb-4">
            {rows.some(r => r.warning) && (
              <p className="text-warm-gray text-[0.8rem] mb-2 italic">
                {fallbackFormat
                  ? <>Rows using fallback will be imported as <strong className="text-navy">{fallbackFormat}</strong>.</>
                  : 'Rows using fallback will have no format set.'}
              </p>
            )}
            <p className="text-warm-gray text-[0.8rem] mb-2">
              {rows.length} movie{rows.length !== 1 ? 's' : ''} found
              {rows.filter(r => r.status === 'duplicate').length > 0 &&
                ` · ${rows.filter(r => r.status === 'duplicate').length} duplicate${rows.filter(r => r.status === 'duplicate').length !== 1 ? 's' : ''}`
              }
              {rows.filter(r => r.warning).length > 0 &&
                ` · ${rows.filter(r => r.warning).length} format warning${rows.filter(r => r.warning).length !== 1 ? 's' : ''}`
              }
            </p>
            <div className="border border-powder-blue rounded overflow-hidden max-h-75 overflow-y-auto">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-1 px-3 py-2 border-b border-powder-blue text-[0.8rem] ${i % 2 === 0 ? 'bg-white' : 'bg-cream'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-bold w-3 text-center ${statusClass(r.status)}`}>
                      {statusIcon(r.status)}
                    </span>
                    <span className="text-navy flex-1">
                      {r.row.title}
                      {r.row.year && <span className="text-warm-gray ml-1">({r.row.year})</span>}
                    </span>
                    {r.message && (
                      <span className="text-warm-gray text-[0.75rem] italic">{r.message}</span>
                    )}
                  </div>
                  {r.warning && (
                    <div className="pl-6 text-warm-gray text-[0.72rem] italic">⚠ {r.warning}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {progress && (
          <div className="mb-4">
            <div className="flex justify-between text-[0.75rem] text-warm-gray mb-1">
              <span>Importing...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full h-1.5 bg-powder-blue rounded-full overflow-hidden">
              <div
                className="h-full bg-mint rounded-full transition-[width] duration-300 ease-in-out"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="bg-white border border-powder-blue rounded p-4 mb-4 text-sm text-navy">
            <strong>Import complete</strong>
            <p className="text-warm-gray mt-2 mb-0">
              {summary.imported} imported · {summary.skipped} skipped · {summary.errors} errors
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-4">
          <button
            onClick={onClose}
            className="bg-white text-warm-gray border border-warm-gray px-4 py-2 cursor-pointer font-serif rounded-sm text-sm"
          >
            {summary ? 'Close' : 'Cancel'}
          </button>
          {isParsed && !summary && currentDuplicateIndex === null && (
            <button
              onClick={handleStartImport}
              disabled={isImporting}
              className={`text-navy border-none px-6 py-2 cursor-pointer font-serif rounded-sm text-sm font-bold ${isImporting ? 'bg-warm-gray cursor-not-allowed' : 'bg-powder-blue'}`}
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
