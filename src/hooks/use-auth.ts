'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

export interface UserSession {
  email: string
  name: string
  isFilial: boolean
  filialName: 'trade' | 'connect' | 'connecthealth' | null
}

export function useAuth() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function getUser() {
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser()
        if (supabaseUser && supabaseUser.email) {
          const email = supabaseUser.email.toLowerCase()
          const isFilial = email === 'acesso3@trade.com' || email.endsWith('@trade.com') || email.includes('connecthealth') || email.includes('connect')
          const filialName = email.includes('trade') ? 'trade' : email.includes('connecthealth') ? 'connecthealth' : email.includes('connect') ? 'connect' : null

          setUser({
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
            isFilial,
            filialName,
          })
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Error fetching user session:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        const email = session.user.email.toLowerCase()
        const isFilial = email === 'acesso3@trade.com' || email.endsWith('@trade.com') || email.includes('connecthealth') || email.includes('connect')
        const filialName = email.includes('trade') ? 'trade' : email.includes('connecthealth') ? 'connecthealth' : email.includes('connect') ? 'connect' : null

        setUser({
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
          isFilial,
          filialName,
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
