'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const nextPath = formData.get('next') as string | null
  const isTechnicianPortal = nextPath === '/technician'

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const errorMsg = 'Invalid email or password.'
    return redirect(`/login?${isTechnicianPortal ? 'next=/technician&' : ''}message=${encodeURIComponent(errorMsg)}`)
  }

  // Fetch authenticated user info
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    await supabase.auth.signOut()
    const errorMsg = 'Authentication session failed.'
    return redirect(`/login?${isTechnicianPortal ? 'next=/technician&' : ''}message=${encodeURIComponent(errorMsg)}`)
  }

  // Fetch the role of the profile
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    await supabase.auth.signOut()
    const errorMsg = 'User profile or authorization details could not be found.'
    return redirect(`/login?${isTechnicianPortal ? 'next=/technician&' : ''}message=${encodeURIComponent(errorMsg)}`)
  }

  const role = profile.role as string

  if (isTechnicianPortal) {
    // Only technician and helper accounts are permitted to log in to the download/technician portal
    if (role !== 'technician' && role !== 'helper') {
      await supabase.auth.signOut()
      const errorMsg = 'Access Denied. Only Technician and Helper accounts can log in here.'
      return redirect(`/login?next=/technician&message=${encodeURIComponent(errorMsg)}`)
    }
  } else {
    // Technicians and helpers are restricted from accessing the admin dashboard portal
    if (role === 'technician' || role === 'helper') {
      await supabase.auth.signOut()
      const errorMsg = 'Access Denied. Technicians and Helpers must access from the mobile application.'
      return redirect(`/login?message=${encodeURIComponent(errorMsg)}`)
    }
  }

  revalidatePath('/', 'layout')
  redirect(nextPath || '/dashboard')
}

export async function sendOtp(formData: FormData) {
  const supabase = await createClient()
  const phone = formData.get('phone') as string
  const nextPath = formData.get('next') as string | null
  const formattedPhone = `+63${phone.replace(/\D/g, '')}`

  const { error } = await supabase.auth.signInWithOtp({
    phone: formattedPhone,
  })

  if (error) {
    console.error("OTP Send Error:", error)
    return { error: 'Failed to send OTP to this number. Make sure the number is registered.' }
  }
  return { success: true }
}

export async function verifyOtpAction(formData: FormData) {
  const supabase = await createClient()
  const phone = formData.get('phone') as string
  const token = formData.get('otp') as string
  const nextPath = formData.get('next') as string | null
  const isTechnicianPortal = nextPath === '/technician'
  const formattedPhone = `+63${phone.replace(/\D/g, '')}`

  const { error } = await supabase.auth.verifyOtp({
    phone: formattedPhone,
    token,
    type: 'sms',
  })

  if (error) {
    const errorMsg = 'Invalid or expired OTP.'
    return redirect(`/login?${isTechnicianPortal ? 'next=/technician&' : ''}message=${encodeURIComponent(errorMsg)}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    await supabase.auth.signOut()
    return redirect(`/login?${isTechnicianPortal ? 'next=/technician&' : ''}message=${encodeURIComponent('Session failed')}`)
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    await supabase.auth.signOut()
    return redirect(`/login?${isTechnicianPortal ? 'next=/technician&' : ''}message=${encodeURIComponent('Profile not found')}`)
  }

  const role = profile.role as string

  if (isTechnicianPortal) {
    if (role !== 'technician' && role !== 'helper') {
      await supabase.auth.signOut()
      return redirect(`/login?next=/technician&message=${encodeURIComponent('Access Denied. Only Technician and Helper accounts can log in here.')}`)
    }
  } else {
    if (role === 'technician' || role === 'helper') {
      await supabase.auth.signOut()
      return redirect(`/login?message=${encodeURIComponent('Access Denied. Technicians must access from the mobile application.')}`)
    }
  }

  revalidatePath('/', 'layout')
  redirect(nextPath || '/dashboard')
}
