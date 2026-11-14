'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Each person signs in with a username; the login email is <username>@technocycle.ph.
// (Demo accounts: ceo / ceo, hr / hr, coordinator / coordinator.)
const DOMAIN = 'technocycle.ph'

const HOME_BY_ROLE: Record<string, string> = {
  ceo: '/ceo',
  hr: '/hr',
  coordinator: '/coordinator',
  technician: '/technician',
  helper: '/technician',
}

export async function login(formData: FormData) {
  const identifier = String(formData.get('username') || formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')

  if (!identifier || !password) {
    return redirect('/login?message=Please enter your username and password')
  }

  const email = identifier.includes('@') ? identifier : `${identifier.replace(/\s+/g, '.')}@${DOMAIN}`
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return redirect('/login?message=Invalid username or password')
  }

  const { data: profile } = await supabase.from('profiles').select('role, lifecycle_status').eq('id', data.user.id).single()
  if (!profile || !['active', 'on_leave'].includes(profile.lifecycle_status)) {
    await supabase.auth.signOut()
    return redirect('/login?message=This account is not active. Please contact HR.')
  }

  const home = HOME_BY_ROLE[profile.role] || '/technician'

  // The proxy reads these to send each role to its own dashboard.
  await supabase.auth.updateUser({ data: { role: profile.role, default_dashboard_route: home } })

  return redirect(home)
}
