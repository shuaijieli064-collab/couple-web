import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { type Profile } from '../types/database'

export function usePartner() {
  const { user } = useAuth()
  const [partner, setPartner] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    async function fetchPartner() {
      if (!user) return
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .limit(1)

        if (profiles && profiles.length > 0) {
          setPartner(profiles[0] as Profile)
        }
      } catch (err) {
        console.error('Failed to fetch partner:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPartner()
  }, [user])

  return { partner, loading }
}