'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GlobalRealtimeSync() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timeoutId: NodeJS.Timeout

    const channel = supabase
      .channel('global-admin-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Global Sync Event Detected:', payload)
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            router.refresh()
          }, 500)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      clearTimeout(timeoutId)
    }
  }, [router])

  return null
}
