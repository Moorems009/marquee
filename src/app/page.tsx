'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import MovieLibrary from '@/components/MovieLibrary'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Session:', session)
      if (!session) {
        router.push('/auth')
      }
    }
    checkUser()
  }, [])

  return (
    <main>
      <h1>Marquee</h1>
      <MovieLibrary />
    </main>
  )
}