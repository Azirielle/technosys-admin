import { createClient } from '@/lib/supabase/server'

const ROLE_LABELS: Record<string, string> = {
  ceo: 'Chief Executive Officer',
  hr: 'HR Department',
  coordinator: 'Service Dept',
  technician: 'Technician',
  helper: 'Helper',
}

/** The signed-in person's name and role, for server components. */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single()
  if (!profile) return null
  return { id: profile.id, name: profile.full_name, role: profile.role, roleLabel: ROLE_LABELS[profile.role] || profile.role }
}
