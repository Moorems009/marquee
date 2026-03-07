'use client'

import { Component, ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

type State = {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div style={{
          padding: '1rem',
          border: '1px solid var(--blush)',
          borderRadius: '4px',
          backgroundColor: 'white',
          color: 'var(--warm-gray)',
          fontFamily: 'Georgia, serif',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <span>Something went wrong in this section.</span>
          <button
            onClick={this.reset}
            style={{
              background: 'none',
              border: '1px solid var(--powder-blue)',
              borderRadius: '2px',
              padding: '0.25rem 0.75rem',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              fontSize: '0.8rem',
              color: 'var(--navy)',
              whiteSpace: 'nowrap',
            }}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
