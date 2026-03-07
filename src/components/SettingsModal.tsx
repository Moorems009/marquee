'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fieldLabelStyle, sectionHeadingStyle } from '@/lib/styles'

type UserSettings = {
  defaultView: 'list' | 'grid'
}

type Props = {
  currentSettings: UserSettings
  onClose: () => void
  onSave: (settings: UserSettings) => void
}

export default function SettingsModal({ currentSettings, onClose, onSave }: Props) {
  const supabase = createClient()
  const [defaultView, setDefaultView] = useState<'list' | 'grid'>(currentSettings.defaultView)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const settings: UserSettings = { defaultView }
    await supabase.auth.updateUser({ data: { settings } })
    onSave(settings)
    setSaving(false)
    onClose()
  }

  const viewButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.4rem 1rem',
    border: '1px solid var(--powder-blue)',
    borderRadius: '2px',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    fontSize: '0.875rem',
    backgroundColor: active ? 'var(--powder-blue)' : 'white',
    color: 'var(--navy)',
  })

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid var(--powder-blue)',
          borderRadius: '4px',
          padding: '2rem',
          width: '360px',
          maxWidth: '90vw',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ ...sectionHeadingStyle, marginTop: 0, marginBottom: '1.5rem' }}>Settings</h2>

        {/* Default View */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ ...fieldLabelStyle, marginBottom: '0.5rem' }}>Default View</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={viewButtonStyle(defaultView === 'list')} onClick={() => setDefaultView('list')}>
              ☰ List
            </button>
            <button style={viewButtonStyle(defaultView === 'grid')} onClick={() => setDefaultView('grid')}>
              ⊞ Grid
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '2rem' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid var(--powder-blue)',
              padding: '0.4rem 1rem',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              fontSize: '0.875rem',
              color: 'var(--warm-gray)',
              borderRadius: '2px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'var(--powder-blue)',
              border: '1px solid var(--powder-blue)',
              padding: '0.4rem 1rem',
              cursor: saving ? 'default' : 'pointer',
              fontFamily: 'Georgia, serif',
              fontSize: '0.875rem',
              color: 'var(--navy)',
              borderRadius: '2px',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
