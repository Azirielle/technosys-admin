// LeaveCredits: the person's leave credits this year (5 sick + 5 vacation, client Nov 2026) in HR's review: what's left
// now and, for a request still waiting, what's left if HR approves it. Days past the credits are "without credits"
// (absent, no credits): counted, no amounts. The counting is the database's leave_credits().
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LeaveRecord } from './types'

type Credits = { sick_left: number; vacation_left: number; without_credits: number }

export function LeaveCredits({ leave }: { leave: LeaveRecord }) {
  const [now, setNow] = useState<Credits | null>(null)
  const [after, setAfter] = useState<Credits | null>(null)
  useEffect(() => {
    if (!leave.technician_id) return
    const supabase = createClient()
    const year = Number(leave.start_date.slice(0, 4))
    supabase.rpc('leave_credits', { p_person: leave.technician_id, p_year: year }).then(({ data }) => setNow(data as Credits | null))
    if (leave.status === 'pending') {
      supabase.rpc('leave_credits', { p_person: leave.technician_id, p_year: year, p_add_type: leave.leave_type, p_add_start: leave.start_date, p_add_end: leave.end_date })
        .then(({ data }) => setAfter(data as Credits | null))
    } else setAfter(null)
  }, [leave])
  if (!now) return null
  const extra = after ? after.without_credits - now.without_credits : 0
  return (
    <section className="rounded-control bg-surface-soft p-3 text-small">
      <h3 className="font-medium text-ink">Leave credits this year</h3>
      <p className="mt-1 text-ink-2">Sick {now.sick_left} of 5 · Vacation {now.vacation_left} of 5 left{now.without_credits ? ` · ${now.without_credits} day(s) without credits so far` : ''}</p>
      {after && <p className="mt-1 text-ink-2">If you approve: sick {after.sick_left} · vacation {after.vacation_left} left</p>}
      {extra > 0 && <p className="mt-1 font-medium text-danger">{extra} day(s) of this leave are without credits (counted as absent).</p>}
    </section>
  )
}
