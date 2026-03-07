'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import MovieLibrary from '@/components/MovieLibrary'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <main>
      <MovieLibrary />
    </main>
  )
}