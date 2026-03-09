'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { searchMovies, getMovieCredits, getMovieRating, getMovieGenre, getPosterUrl, searchCollection, getCollectionParts } from '@/lib/tmdb'
import { Movie } from '@/lib/types'
import { inputStyle } from '@/lib/styles'
import CollectionReviewCard from './CollectionReviewCard'
import CollectionNotFoundCard from './CollectionNotFoundCard'

type CSVRow = {
  title: string
  director?: string
  year?: string
  format?: string
  imprint?: string
  labels?: string
}

export type CollectionPart = {
  id: number
  title: string
  release_date: string
  poster_path?: string
}

export type ImportStatus = 'pending' | 'duplicate' | 'importing' | 'done' | 'error' | 'collection' | 'reviewing'

export type ImportRow = {
  key: string
  row: CSVRow
  status: ImportStatus
  message?: string
  warning?: string
  collectionLabel?: string
  fromCollection?: boolean
  tmdbNotFound?: boolean
}


type SummaryData = {
  importedStandalone: number
  importedFromCollections: number
  collectionsExpanded: number
  skipped: number
  errors: number
}

type Props = {
  existingMovies: Movie[]
  onClose: () => void
  onImportComplete: (importedIds: string[]) => void
}

export default function ImportCSVModal({ existingMovies, onClose, onImportComplete }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const rowKeyCounter = useRef(0)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [isParsed, setIsParsed] = useState(false)
  const [fallbackFormat, setFallbackFormat] = useState('Blu-ray')
  const [isImporting, setIsImporting] = useState(false)
  const [fetchingCollections, setFetchingCollections] = useState(false)
  const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState<number | null>(null)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [collectionResolution, setCollectionResolution] = useState<'expand' | 'keep'>('expand')
  const [useCollectionLabel, setUseCollectionLabel] = useState(true)
  const collectionsExpandedRef = useRef(0)
  const [reviewParts, setReviewParts] = useState<Record<string, CollectionPart[]>>({})

  function normalizeFormat(raw: string): string | null {
    const val = raw.trim().toLowerCase().replace(/[\s\-_.]/g, '')
    if (['4k', '4kuhd', '4kultrahd', 'ultrahd', 'uhd4k'].includes(val)) return '4K'
    if (['bluray', 'blu', 'blueray', 'bray', 'bd'].includes(val)) return 'Blu-ray'
    if (['dvd'].includes(val)) return 'DVD'
    if (['vhs'].includes(val)) return 'VHS'
    if (['digital', 'dig', 'stream', 'streaming'].includes(val)) return 'Digital'
    return null
  }

  function isCollectionRow(title: string): boolean {
    if (title.includes(' / ')) return true
    return /\b(collection|trilogy|saga|series)\b/i.test(title)
  }

  function parseCSV(text: string): CSVRow[] {
    function splitCSVLine(line: string): string[] {
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
          else { inQuotes = !inQuotes }
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim()); current = ''
        } else { current += char }
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
        const key = String(rowKeyCounter.current++)
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
        const isCollection = !isDuplicate && isCollectionRow(row.title)
        return {
          key,
          row,
          status: isDuplicate ? 'duplicate' : isCollection ? 'collection' : 'pending',
          warning: formatWarning,
          collectionLabel: isCollection ? row.title : undefined
        }
      })
      setRows(importRows)
      setIsParsed(true)
    }
    reader.readAsText(file)
  }

  // Generate a list of progressively-stripped search queries for a collection title.
  // TMDB collection names rarely include "Trilogy", "6-Film Collection", etc.
  function getCollectionSearchQueries(title: string): string[] {
    const queries: string[] = [title]

    // Strip trailing count + keyword patterns, e.g. "6-Film Collection", "4 Film Collection",
    // "Film Collection", "Collection", "Trilogy", "Saga", "Series", "Extended Edition"
    const stripped = title
      .replace(/\s+\d+[-\s]?Film\s+Collection\b.*/i, '')
      .replace(/\s+Film\s+Collection\b.*/i, '')
      .replace(/\s+(?:Collection|Trilogy|Saga|Series)\b.*/i, '')
      .replace(/\s*:?\s*Extended\s+Edition\b.*/i, '')
      .trim()

    if (stripped && stripped !== title) {
      queries.push(stripped)
      // For "X: Y" subtitles also try just "Y" and just "X"
      const colonIdx = stripped.indexOf(':')
      if (colonIdx !== -1) {
        const afterColon = stripped.slice(colonIdx + 1).trim()
        const beforeColon = stripped.slice(0, colonIdx).trim()
        if (afterColon) queries.push(afterColon)
        if (beforeColon) queries.push(beforeColon)
      }
    }

    return [...new Set(queries)]
  }

  // Try each normalized query in sequence until TMDB returns collection parts.
  async function findCollectionParts(title: string): Promise<CollectionPart[]> {
    for (const query of getCollectionSearchQueries(title)) {
      try {
        const results = await searchCollection(query)
        if (results.length > 0) {
          const parts = await getCollectionParts(results[0].id)
          if (parts.length > 0) return parts
        }
      } catch {
        // try next query
      }
    }
    return []
  }

  // Apply the global collection resolution choice.
  // Slash-separated rows expand immediately; TMDB-matched collections go to 'reviewing'
  // so the user can remove individual films before confirming. Unmatched collections
  // get tmdbNotFound: true for per-row manual search.
  async function handleApplyCollections() {
    setFetchingCollections(true)

    const collectionRows = rows.filter(r => r.status === 'collection')

    // Fetch TMDB parts for all named (non-slash) collections in parallel
    const tmdbPartsMap: Record<string, CollectionPart[]> = {}
    if (collectionResolution === 'expand') {
      await Promise.all(
        collectionRows
          .filter(r => !r.row.title.includes(' / '))
          .map(async (r) => {
            tmdbPartsMap[r.key] = await findCollectionParts(r.row.title)
          })
      )
    }

    const newReviewParts: Record<string, CollectionPart[]> = {}
    const updatedRows: ImportRow[] = []

    for (const row of rows) {
      if (row.status !== 'collection') {
        updatedRows.push(row)
        continue
      }

      if (collectionResolution === 'keep') {
        updatedRows.push({ ...row, status: 'pending' })
        continue
      }

      // Slash-separated: expand immediately — user already defined the titles
      if (row.row.title.includes(' / ')) {
        const parts = row.row.title.split(' / ').map((t, i) => ({ id: i, title: t.trim(), release_date: '' }))
        collectionsExpandedRef.current++
        const labelName = useCollectionLabel ? row.collectionLabel : undefined
        for (const part of parts) {
          const labels = labelName
            ? [row.row.labels, labelName].filter(Boolean).join(';')
            : row.row.labels
          updatedRows.push({
            key: String(rowKeyCounter.current++),
            row: { ...row.row, title: part.title, year: row.row.year, labels },
            status: 'pending',
            warning: row.warning,
            collectionLabel: row.collectionLabel,
            fromCollection: true
          })
        }
        continue
      }

      const parts = tmdbPartsMap[row.key] || []
      if (parts.length === 0) {
        // No TMDB match — leave for individual manual review
        updatedRows.push({ ...row, status: 'collection', tmdbNotFound: true })
        continue
      }

      // TMDB match — stage for review before confirming
      newReviewParts[row.key] = parts
      updatedRows.push({ ...row, status: 'reviewing' as ImportStatus })
    }

    setReviewParts(newReviewParts)
    setRows(updatedRows)
    setFetchingCollections(false)
  }

  function handleKeepCollection(key: string) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, status: 'pending' as ImportStatus } : r))
  }

  function handleConfirmAllReviews() {
    const updatedRows = [...rows]
    for (let i = updatedRows.length - 1; i >= 0; i--) {
      const row = updatedRows[i]
      if (row.status !== 'reviewing') continue
      const parts = reviewParts[row.key] || []
      if (parts.length === 0) {
        updatedRows[i] = { ...row, status: 'pending' }
        continue
      }
      collectionsExpandedRef.current++
      const labelName = useCollectionLabel ? row.collectionLabel : undefined
      const newRows: ImportRow[] = parts.map(part => {
        const partYear = part.release_date ? part.release_date.split('-')[0] : row.row.year
        const labels = labelName
          ? [row.row.labels, labelName].filter(Boolean).join(';')
          : row.row.labels
        return {
          key: String(rowKeyCounter.current++),
          row: { ...row.row, title: part.title, year: partYear, labels },
          status: 'pending' as ImportStatus,
          warning: row.warning,
          collectionLabel: row.collectionLabel,
          fromCollection: true
        }
      })
      updatedRows.splice(i, 1, ...newRows)
    }
    setRows(updatedRows)
  }

  function handleConfirmManual(key: string, parts: CollectionPart[]) {
    const rowIndex = rows.findIndex(r => r.key === key)
    if (rowIndex === -1 || parts.length === 0) return
    const originalRow = rows[rowIndex]
    const labelName = useCollectionLabel ? originalRow.collectionLabel : undefined
    collectionsExpandedRef.current++
    const newRows: ImportRow[] = parts.map(part => {
      const partYear = part.release_date ? part.release_date.split('-')[0] : originalRow.row.year
      const labels = labelName
        ? [originalRow.row.labels, labelName].filter(Boolean).join(';')
        : originalRow.row.labels
      return {
        key: String(rowKeyCounter.current++),
        row: { ...originalRow.row, title: part.title, year: partYear, labels },
        status: 'pending' as ImportStatus,
        warning: originalRow.warning,
        collectionLabel: originalRow.collectionLabel,
        fromCollection: true
      }
    })
    const updatedRows = [...rows]
    updatedRows.splice(rowIndex, 1, ...newRows)
    setRows(updatedRows)
  }

  function normTitle(t: string) {
    return t.toLowerCase().replace(/^(the |a |an )/i, '').replace(/[^a-z0-9\s]/g, '').trim()
  }

  function findBestMatch(results: Array<{ title: string; release_date: string; id: number; poster_path?: string }>, searchTitle: string, year?: string) {
    if (results.length === 0) return null
    const searchNorm = normTitle(searchTitle)
    if (year) {
      const hit = results.find(r => normTitle(r.title) === searchNorm && r.release_date?.startsWith(year))
      if (hit) return hit
    }
    const hit = results.find(r => normTitle(r.title) === searchNorm)
    if (hit) return hit
    return results[0]
  }

  async function importRow(row: ImportRow, userId: string): Promise<string | 'error'> {
    const { row: r } = row
    let director = r.director || ''
    let posterUrl = null
    let mpaaRating: string | null = null
    let genre: string | null = null
    let tmdbYear: number | null = null
    const normalizedFormat = r.format ? normalizeFormat(r.format) : null
    const format = normalizedFormat || fallbackFormat

    try {
      const results = await searchMovies(r.title)
      const match = findBestMatch(results, r.title, r.year)
      if (match) {
        if (match.poster_path) posterUrl = getPosterUrl(match.poster_path)
        if (match.release_date) tmdbYear = parseInt(match.release_date.split('-')[0])
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
        title: r.title,
        year: r.year ? parseInt(r.year) : tmdbYear,
        format,
        imprint: r.imprint || null,
        director: director || null,
        poster_url: posterUrl,
        mpaa_rating: mpaaRating,
        genre,
        user_id: userId
      }])
      .select()
      .single()

    if (movieError || !movieData) return 'error'

    if (r.labels) {
      const labelNames = r.labels.split(';').map((l) => l.trim()).filter(Boolean)
      for (const name of labelNames) {
        const { data: existingLabel } = await supabase
          .from('labels').select('*').eq('user_id', userId).ilike('name', name).single()
        let labelId = existingLabel?.id
        if (!labelId) {
          const { data: newLabel } = await supabase
            .from('labels').insert([{ name, user_id: userId }]).select().single()
          labelId = newLabel?.id
        }
        if (labelId) {
          await supabase.from('movie_labels').insert([{ movie_id: movieData.id, label_id: labelId }])
        }
      }
    }

    return movieData.id
  }

  async function runImport(rowsToImport: ImportRow[]) {
    setIsImporting(true)
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id
    if (!userId) { setIsImporting(false); return }

    let importedStandalone = 0
    let importedFromCollections = 0
    let skipped = 0
    let errors = 0
    const importedIds: string[] = []

    const pendingIndices = rowsToImport.map((r, i) => r.status === 'pending' ? i : -1).filter(i => i !== -1)
    const total = pendingIndices.length
    let current = 0
    setProgress({ current: 0, total })

    const updatedRows = [...rowsToImport]
    skipped = rowsToImport.filter(r => r.status === 'duplicate').length

    const BATCH_SIZE = 5
    for (let b = 0; b < pendingIndices.length; b += BATCH_SIZE) {
      const batch = pendingIndices.slice(b, b + BATCH_SIZE)
      batch.forEach(i => { updatedRows[i] = { ...updatedRows[i], status: 'importing' } })
      setRows([...updatedRows])

      const results = await Promise.all(batch.map(i => importRow(updatedRows[i], userId)))

      results.forEach((result, bi) => {
        const i = batch[bi]
        current++
        if (result !== 'error') {
          if (updatedRows[i].fromCollection) importedFromCollections++
          else importedStandalone++
          importedIds.push(result)
          updatedRows[i] = { ...updatedRows[i], status: 'done' }
        } else {
          errors++
          updatedRows[i] = { ...updatedRows[i], status: 'error', message: 'Failed to import' }
        }
      })

      setProgress({ current, total })
      setRows([...updatedRows])
    }

    setSummary({
      importedStandalone,
      importedFromCollections,
      collectionsExpanded: collectionsExpandedRef.current,
      skipped,
      errors
    })
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
          (m) => m.title.toLowerCase() === row.title.toLowerCase() && String(m.year) === String(row.year)
        )
        if (existing) await supabase.from('movies').delete().eq('id', existing.id)
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
        (m) => m.title.toLowerCase() === row.title.toLowerCase() && String(m.year) === String(row.year)
      )
      if (existing) await supabase.from('movies').delete().eq('id', existing.id)
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
    if (status === 'collection') return '⊕'
    return '·'
  }

  const statusClass = (status: ImportStatus) => {
    if (status === 'done') return 'text-mint'
    if (status === 'error') return 'text-dusty-rose'
    if (status === 'importing') return 'text-butter'
    if (status === 'duplicate') return 'text-blush'
    if (status === 'collection') return 'text-powder-blue'
    return 'text-warm-gray'
  }

  const hasUnresolvedCollections = rows.some(r => r.status === 'collection' || r.status === 'reviewing')
  // Collections still awaiting global Apply (not yet attempted)
  const pendingCollectionCount = rows.filter(r => r.status === 'collection' && !r.tmdbNotFound).length
  // Collections found on TMDB — staged for film-level review
  const reviewingCollections = rows.filter(r => r.status === 'reviewing')
  // Collections that had no TMDB match and need individual review
  const notFoundCollections = rows.filter(r => r.status === 'collection' && r.tmdbNotFound)
  // True while the user is actively reviewing/editing collection films
  const isReviewStep = isParsed && (reviewingCollections.length > 0 || notFoundCollections.length > 0) && !summary

  const rowPreview = isParsed && rows.length > 0 && (
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
        {rows.filter(r => r.status === 'duplicate').length > 0 && ` · ${rows.filter(r => r.status === 'duplicate').length} duplicate${rows.filter(r => r.status === 'duplicate').length !== 1 ? 's' : ''}`}
        {hasUnresolvedCollections && ` · ${rows.filter(r => r.status === 'collection').length} collection${rows.filter(r => r.status === 'collection').length !== 1 ? 's' : ''}`}
        {rows.filter(r => r.warning).length > 0 && ` · ${rows.filter(r => r.warning).length} format warning${rows.filter(r => r.warning).length !== 1 ? 's' : ''}`}
      </p>
      <div className="border border-powder-blue rounded overflow-hidden max-h-75 overflow-y-auto">
        {rows.map((r, i) => (
          <div
            key={r.key}
            className={`flex flex-col gap-1 px-3 py-2 border-b border-powder-blue text-[0.8rem] ${i % 2 === 0 ? 'bg-white' : 'bg-cream'}`}
          >
            <div className="flex items-center gap-3">
              <span className={`font-bold w-3 text-center ${statusClass(r.status)}`}>{statusIcon(r.status)}</span>
              <span className="text-navy flex-1">
                {r.row.title}
                {r.row.year && <span className="text-warm-gray ml-1">({r.row.year})</span>}
              </span>
              {r.message && <span className="text-warm-gray text-[0.75rem] italic">{r.message}</span>}
            </div>
            {r.warning && <div className="pl-6 text-warm-gray text-[0.72rem] italic">⚠ {r.warning}</div>}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-[rgba(44,62,107,0.4)] flex items-center justify-center z-1000"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-cream border border-powder-blue rounded p-8 w-full mx-4 max-h-[92vh] overflow-y-auto transition-[max-width] duration-300 ${isReviewStep ? 'max-w-5xl' : 'max-w-140'}`}
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
              <select value={fallbackFormat} onChange={(e) => setFallbackFormat(e.target.value)} className={inputStyle}>
                <option>Blu-ray</option>
                <option>4K</option>
                <option>DVD</option>
                <option>VHS</option>
                <option>Digital</option>
                <option value="">Leave Blank</option>
              </select>
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className={inputStyle} style={{ cursor: 'pointer' }} />
          </div>
        )}

        {/* Global collection resolution panel — shown until Apply is clicked */}
        {isParsed && pendingCollectionCount > 0 && !summary && (
          <div className="bg-white border border-powder-blue rounded p-4 mb-4">
            <div className="text-[0.8rem] font-bold text-navy mb-3">
              {pendingCollectionCount} collection{pendingCollectionCount !== 1 ? 's' : ''} detected
            </div>
            <div className="flex flex-col gap-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-navy">
                <input type="radio" name="collectionRes" checked={collectionResolution === 'expand'} onChange={() => setCollectionResolution('expand')} className="cursor-pointer" />
                Expand all into individual films
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-navy">
                <input type="radio" name="collectionRes" checked={collectionResolution === 'keep'} onChange={() => setCollectionResolution('keep')} className="cursor-pointer" />
                Keep all as single entries
              </label>
            </div>
            {collectionResolution === 'expand' && (
              <label className="flex items-center gap-2 cursor-pointer text-sm text-navy mb-3">
                <input type="checkbox" checked={useCollectionLabel} onChange={() => setUseCollectionLabel(v => !v)} className="cursor-pointer" />
                Use collection title as a label for each film
              </label>
            )}
            <button
              onClick={handleApplyCollections}
              disabled={fetchingCollections}
              className={`border-none px-4 py-1.5 font-serif text-sm rounded-sm ${fetchingCollections ? 'bg-warm-gray text-white cursor-default' : 'bg-powder-blue text-navy cursor-pointer'}`}
            >
              {fetchingCollections ? 'Fetching collection data…' : `Apply to all ${pendingCollectionCount} collection${pendingCollectionCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* Review panel — TMDB-matched collections awaiting film-level confirmation */}
        {isParsed && reviewingCollections.length > 0 && !summary && (
          <div className="bg-white border border-powder-blue rounded p-4 mb-4">
            <div className="text-[0.8rem] font-bold text-navy mb-1">
              Review {reviewingCollections.length} expanded collection{reviewingCollections.length !== 1 ? 's' : ''}
            </div>
            <p className="text-warm-gray text-[0.75rem] mt-0 mb-3">
              Remove any films you don&apos;t want imported. Collections with all films removed will be kept as a single entry.
            </p>
            <div className="flex flex-col gap-3">
              {reviewingCollections.map(r => (
                <CollectionReviewCard
                  key={r.key}
                  row={r}
                  parts={reviewParts[r.key] || []}
                  onPartsChange={(parts) => setReviewParts(prev => ({ ...prev, [r.key]: parts }))}
                  onKeepAsIs={() => handleKeepCollection(r.key)}
                />
              ))}
            </div>
            <button
              onClick={handleConfirmAllReviews}
              className="mt-4 bg-powder-blue text-navy border-none px-4 py-1.5 cursor-pointer font-serif rounded-sm text-sm font-bold"
            >
              Confirm all expansions
            </button>
          </div>
        )}

        {/* Individual review for collections with no TMDB match */}
        {isParsed && notFoundCollections.length > 0 && !summary && (
          <div className="bg-white border border-blush rounded p-4 mb-4">
            <div className="text-[0.8rem] font-bold text-navy mb-1">
              {notFoundCollections.length} collection{notFoundCollections.length !== 1 ? 's' : ''} not found on TMDB
            </div>
            <p className="text-warm-gray text-[0.75rem] mt-0 mb-3">
              Search for films to add manually, or keep as a single entry.
              {useCollectionLabel && <span className="italic"> Collection title will be applied as a label.</span>}
            </p>
            <div className="flex flex-col gap-4">
              {notFoundCollections.map(r => (
                <CollectionNotFoundCard
                  key={r.key}
                  row={r}
                  useCollectionLabel={useCollectionLabel}
                  onKeepAsIs={() => handleKeepCollection(r.key)}
                  onConfirm={(parts) => handleConfirmManual(r.key, parts)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Duplicate resolution */}
        {currentDuplicateIndex !== null && (
          <div className="bg-white border border-blush rounded p-4 mb-4">
            <p className="text-navy text-sm mb-3 mt-0">
              <strong>{rows[currentDuplicateIndex].row.title}</strong> ({rows[currentDuplicateIndex].row.year}) already exists in your shelf. What would you like to do?
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button onClick={() => handleDuplicateChoice('skip')} className="bg-white text-warm-gray border border-warm-gray px-4 py-1.5 cursor-pointer font-serif rounded-sm text-sm">Skip</button>
                <button onClick={() => handleDuplicateChoice('overwrite')} className="bg-powder-blue text-navy border-none px-4 py-1.5 cursor-pointer font-serif rounded-sm text-sm font-bold">Overwrite</button>
              </div>
              {rows.filter((r) => r.status === 'duplicate').length > 1 && (
                <div className="flex gap-2">
                  <button onClick={handleSkipAll} className="bg-white text-warm-gray border border-warm-gray px-4 py-1 cursor-pointer font-serif rounded-sm text-xs">Skip all duplicates</button>
                  <button onClick={handleOverwriteAll} className="bg-white text-navy border border-powder-blue px-4 py-1 cursor-pointer font-serif rounded-sm text-xs">Overwrite all duplicates</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Row preview */}
        {rowPreview}

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
            <div className="mt-2 flex flex-col gap-1">
              {summary.importedStandalone > 0 && (
                <p className="text-warm-gray m-0">
                  {summary.importedStandalone} standalone movie{summary.importedStandalone !== 1 ? 's' : ''} imported
                </p>
              )}
              {summary.importedFromCollections > 0 && (
                <p className="text-warm-gray m-0">
                  {summary.importedFromCollections} film{summary.importedFromCollections !== 1 ? 's' : ''} from {summary.collectionsExpanded} expanded collection{summary.collectionsExpanded !== 1 ? 's' : ''}
                </p>
              )}
              {summary.skipped > 0 && (
                <p className="text-warm-gray m-0">{summary.skipped} duplicate{summary.skipped !== 1 ? 's' : ''} skipped</p>
              )}
              {summary.errors > 0 && (
                <p className="text-dusty-rose m-0">{summary.errors} error{summary.errors !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-4">
          <button onClick={onClose} className="bg-white text-warm-gray border border-warm-gray px-4 py-2 cursor-pointer font-serif rounded-sm text-sm">
            {summary ? 'Close' : 'Cancel'}
          </button>
          {isParsed && !summary && currentDuplicateIndex === null && !hasUnresolvedCollections && (
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
