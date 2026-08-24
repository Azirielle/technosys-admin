import { createClient } from './server'

export type UserProfile = {
  id: string
  full_name: string
  role: string
  activeRoles: string[]
  isOverridden: boolean
}

export async function getServerProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  let activeRoles = [profile.role]
  let isOverridden = false

  const { data: overrides } = await supabase
    .from('role_overrides')
    .select('granted_role')
    .eq('target_user_id', user.id)
    .gt('expires_at', new Date().toISOString())

  if (overrides && overrides.length > 0) {
    const granted = overrides.map((o: any) => o.granted_role)
    activeRoles = [...activeRoles, ...granted]
    isOverridden = true
  }

  return {
    id: user.id,
    full_name: profile.full_name,
    role: profile.role,
    activeRoles,
    isOverridden
  }
}
