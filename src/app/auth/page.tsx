'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { inputStyle, fieldLabelStyle } from '@/lib/styles'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Check your email to confirm your account!')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        window.location.href = '/'
      }
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl italic text-navy text-center mb-2">Marquee</h1>
        <h2 className="text-sm text-warm-gray uppercase tracking-widest text-center mb-8">
          {isSignUp ? 'Create an account' : 'Sign in'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={fieldLabelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputStyle}
            />
          </div>
          <div>
            <label className={fieldLabelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-powder-blue text-navy border-none py-2 px-6 cursor-pointer font-serif rounded-sm font-bold text-sm mt-2"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {message && (
          <p className="text-sm text-warm-gray mt-4 text-center">{message}</p>
        )}

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="block w-full text-center mt-4 text-sm text-warm-gray bg-transparent border-none cursor-pointer font-serif underline"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </main>
  )
}
