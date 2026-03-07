'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { searchMovies, getMovieCredits, getPosterUrl } from '@/lib/tmdb'
import { Movie, Label } from '@/lib/types'
import { inputStyle, fieldLabelStyle } from '@/lib/styles'

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
}

type Props = {
  existingMovies: Movie[]
  onClose: () => void
  onImportComplete: () => void
}

export default function ImportCSVModal({ existingMovies, onClose, onImportComplete }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [isParsed, setIsParsed] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState<number | null>(null)
  const [summary, setSummary] = useState<{ imported: number; skipped: number; errors: number } | null>(null)
const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  function parseCSV(text: string): CSVRow[] {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] || '' })
      return {
        title: row['title'] || '',
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
        const isDuplicate = existingMovies.some(
          (m) =>
            m.title.toLowerCase() === row.title.toLowerCase() &&
            String(m.year) === String(row.year)
        )
        return { row, status: isDuplicate ? 'duplicate' : 'pending' }
      })
      setRows(importRows)
      setIsParsed(true)
    }
    reader.readAsText(file)
  }

  async function importRow(importRow: ImportRow): Promise<'imported' | 'error'> {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) return 'error'

    const { row } = importRow
    let director = row.director || ''
    let posterUrl = null
    let format = row.format || 'Blu-ray'

    // TMDB lookup
    try {
      const results = await searchMovies(row.title)
      const match = results.find((r: { title: string; release_date: string }) =>
        r.title.toLowerCase() === row.title.toLowerCase() &&
        (row.year ? r.release_date?.startsWith(row.year) : true)
      ) || results[0]

      if (match) {
        if (match.poster_path) posterUrl = getPosterUrl(match.poster_path)
        if (!director) {
          const credits = await getMovieCredits(match.id)
          director = credits.director || ''
        }
      }
    } catch {
      // TMDB failed, continue with what we have
    }

    // Insert movie
    const { data: movieData, error: movieError } = await supabase
      .from('movies')
      .insert([{
        title: row.title,
        year: row.year ? parseInt(row.year) : null,
        format,
        imprint: row.imprint || null,
        director: director || null,
        poster_url: posterUrl,
        user_id: user.id
      }])
      .select()
      .single()

    if (movieError || !movieData) return 'error'

    // Handle labels
    if (row.labels) {
      const labelNames = row.labels.split(';').map((l) => l.trim()).filter(Boolean)
      for (const name of labelNames) {
        // Check if label exists
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

    return 'imported'
  }

  async function runImport(rowsToImport: ImportRow[]) {
    setIsImporting(true)
    let imported = 0
    let skipped = 0
    let errors = 0

    const pending = rowsToImport.filter((r) => r.status === 'pending')
    const total = pending.length
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

        if (result === 'imported') {
          imported++
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
    onImportComplete()
  }

  async function handleStartImport() {
    // Find first unresolved duplicate
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
      // Delete existing movie first, then mark as pending
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

    // Find next duplicate
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

  const statusColor = (status: ImportStatus) => {
    if (status === 'done') return 'var(--mint)'
    if (status === 'error') return 'var(--dusty-rose)'
    if (status === 'importing') return 'var(--butter)'
    if (status === 'duplicate') return 'var(--blush)'
    return 'var(--warm-gray)'
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
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
          maxWidth: '560px',
          margin: '1rem',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <h2 style={{
          margin: '0 0 1.5rem 0',
          fontSize: '1.1rem',
          color: 'var(--dusty-rose)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>Import CSV</h2>

        {/* Step 1: File upload */}
        {!isParsed && (
          <div>
            <p style={{ color: 'var(--warm-gray)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Upload a CSV with columns: <strong>Title, Director, Year, Format, Imprint, Labels</strong>.
              Labels should be separated by semicolons (e.g. <em>Horror;Criterion</em>).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ ...inputStyle, cursor: 'pointer' }}
            />
          </div>
        )}

        {/* Step 2: Duplicate resolution */}
        {currentDuplicateIndex !== null && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid var(--blush)',
            borderRadius: '4px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: '0 0 0.75rem 0', color: 'var(--navy)', fontSize: '0.875rem' }}>
              <strong>{rows[currentDuplicateIndex].row.title}</strong> ({rows[currentDuplicateIndex].row.year}) already exists in your library. What would you like to do?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleDuplicateChoice('skip')}
                style={{
                  backgroundColor: 'white',
                  color: 'var(--warm-gray)',
                  border: '1px solid var(--warm-gray)',
                  padding: '0.4rem 1rem',
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                  borderRadius: '2px',
                  fontSize: '0.875rem'
                }}
              >
                Skip
              </button>
              <button
                onClick={() => handleDuplicateChoice('overwrite')}
                style={{
                  backgroundColor: 'var(--powder-blue)',
                  color: 'var(--navy)',
                  border: 'none',
                  padding: '0.4rem 1rem',
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                  borderRadius: '2px',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}
              >
                Overwrite
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Row preview / progress */}
        {isParsed && rows.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: 'var(--warm-gray)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              {rows.length} movie{rows.length !== 1 ? 's' : ''} found
              {rows.filter(r => r.status === 'duplicate').length > 0 &&
                ` · ${rows.filter(r => r.status === 'duplicate').length} duplicate${rows.filter(r => r.status === 'duplicate').length !== 1 ? 's' : ''}`
              }
            </p>
            <div style={{
              border: '1px solid var(--powder-blue)',
              borderRadius: '4px',
              overflow: 'hidden',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {rows.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: i % 2 === 0 ? 'white' : 'var(--cream)',
                    borderBottom: '1px solid var(--powder-blue)',
                    fontSize: '0.8rem'
                  }}
                >
                  <span style={{ color: statusColor(r.status), fontWeight: 'bold', width: '12px', textAlign: 'center' }}>
                    {statusIcon(r.status)}
                  </span>
                  <span style={{ color: 'var(--navy)', flex: 1 }}>
                    {r.row.title}
                    {r.row.year && <span style={{ color: 'var(--warm-gray)', marginLeft: '0.4rem' }}>({r.row.year})</span>}
                  </span>
                  {r.message && (
                    <span style={{ color: 'var(--warm-gray)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                      {r.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
{/* Progress bar */}
        {progress && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--warm-gray)',
              marginBottom: '0.4rem'
            }}>
              <span>Importing...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'var(--powder-blue)',
              borderRadius: '999px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                backgroundColor: 'var(--mint)',
                borderRadius: '999px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
   
        {/* Summary */}
        {summary && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid var(--powder-blue)',
            borderRadius: '4px',
            padding: '1rem',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: 'var(--navy)'
          }}>
            <strong>Import complete</strong>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--warm-gray)' }}>
              {summary.imported} imported · {summary.skipped} skipped · {summary.errors} errors
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
          <button
            onClick={onClose}
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
            {summary ? 'Close' : 'Cancel'}
          </button>
          {isParsed && !summary && currentDuplicateIndex === null && (
            <button
              onClick={handleStartImport}
              disabled={isImporting}
              style={{
                backgroundColor: isImporting ? 'var(--warm-gray)' : 'var(--powder-blue)',
                color: 'var(--navy)',
                border: 'none',
                padding: '0.5rem 1.5rem',
                cursor: isImporting ? 'not-allowed' : 'pointer',
                fontFamily: 'Georgia, serif',
                borderRadius: '2px',
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}