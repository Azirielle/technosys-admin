'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

/**
 * Normalizes input name/role into the internal Supabase identity.
 */
const ROLE_IDENTITY_MAP: Record<string, string> = {
  // CEO
  'ceo': 'ceo@technocycle.ph',
  'carlos': 'ceo@technocycle.ph',
  'carlos ceo': 'ceo@technocycle.ph',

  // HR
  'hr': 'hr@technocycle.ph',
  'helena': 'hr@technocycle.ph',
  'helena hr': 'hr@technocycle.ph',

  // Accountant
  'accountant': 'accountant@technocycle.ph',
  'alicia': 'accountant@technocycle.ph',
  'alicia accountant': 'accountant@technocycle.ph',

  // Coordinator
  'coordinator': 'coordinator@technocycle.ph',
  'aileen': 'coordinator@technocycle.ph',
  'aileen admin': 'coordinator@technocycle.ph',
  'aileen coordinator': 'coordinator@technocycle.ph',
}

export async function login(formData: FormData) {
  const inputIdentifier = ((formData.get('username') as string) || (formData.get('email') as string) || '').trim()
  const password = (formData.get('password') as string || '')
  const supabase = await createClient()

  if (!inputIdentifier || !password) {
    return redirect('/login?message=Please enter your administrative name and password')
  }

  // Virtual Identity Proxy: Map Name/Role to Supabase Auth anchor
  const normalizedKey = inputIdentifier.toLowerCase().replace(/\s+/g, ' ')
  let resolvedEmail = ROLE_IDENTITY_MAP[normalizedKey]

  if (!resolvedEmail) {
    if (inputIdentifier.includes('@')) {
      resolvedEmail = inputIdentifier
    } else {
      // Dynamic fallback: Query profiles by full_name
      const { data: matchedProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .ilike('full_name', inputIdentifier)
        .maybeSingle()

      if (matchedProfile?.role && ROLE_IDENTITY_MAP[matchedProfile.role]) {
        resolvedEmail = ROLE_IDENTITY_MAP[matchedProfile.role]
      } else {
        resolvedEmail = `${normalizedKey}@technocycle.ph`
      }
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password,
  })

  if (error || !data.user) {
    return redirect('/login?message=Invalid administrative name or password')
  }

  // Authoritative Role Lookup from public.profiles
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  let finalRoute = '/hr' // Default system fallback
  const userRole = profile?.role

  switch (userRole) {
    case 'ceo':
    case 'coo':
    case 'super_admin':
      finalRoute = '/ceo'
      break
    case 'hr':
      finalRoute = '/hr'
      break
    case 'coordinator':
    case 'branch_manager':
    case 'supervisor':
    case 'admin':
      finalRoute = '/coordinator'
      break
    case 'accountant':
      finalRoute = '/accountant'
      break
    case 'technician':
    case 'helper':
      finalRoute = '/technician'
      break
    default:
      finalRoute = '/hr'
      break
  }

  // Synchronize session metadata for Edge Proxy routing
  await supabase.auth.updateUser({
    data: { 
      role: userRole || 'staff',
      default_dashboard_route: finalRoute 
    }
  })

  return redirect(finalRoute)
}

/**
 * @deprecated Legacy Phone/OTP login stub preserved for backwards-compatibility.
 */
export async function sendOtp(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  return { success: false, error: 'Phone OTP authentication has been deprecated in favor of Administrative Name authentication.' }
}

/**
 * @deprecated Legacy Phone/OTP verify stub preserved for backwards-compatibility.
 */
export async function verifyOtpAction(formData: FormData) {
  return redirect('/login?message=Phone OTP authentication has been deprecated.')
}
