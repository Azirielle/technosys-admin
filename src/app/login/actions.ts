'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const roleOverride = formData.get('role_override') as string
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return redirect('/login?message=Could not authenticate user')
  }

  let finalRoute = '/coordinator'; // Global system fallback

  if (roleOverride !== 'auto') {
    finalRoute = roleOverride;
  } else {
    // Attempt DB lookup if they selected Auto
    const { data: roleData } = await supabase
      .from('roles') // Assuming standard 'roles' table exists
      .select('default_dashboard_route')
      .eq('user_id', data.user.id)
      .single();
      
    if (roleData?.default_dashboard_route) {
      finalRoute = roleData.default_dashboard_route;
    }
  }

  // Inject into session metadata for the Edge Proxy to read during routing
  await supabase.auth.updateUser({
    data: { default_dashboard_route: finalRoute }
  });

  return redirect('/')
}
