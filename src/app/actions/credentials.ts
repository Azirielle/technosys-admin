'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { passwordProblem } from '@/lib/password'

export async function updateAdminPassword(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const currentPassword = (formData.get('current_password') as string || '')
    // Not trimmed: the saved password is exactly what was typed (passwordProblem refuses spaces at the ends)
    const newPassword = (formData.get('new_password') as string || '')
    const confirmPassword = (formData.get('confirm_password') as string || '')

    const problem = passwordProblem(newPassword)
    if (problem) return { success: false, error: problem }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'New password and confirmation password do not match.' }
    }

    const supabase = await createClient()
    const { data: { user }, error: userErr } = await supabase.auth.getUser()

    if (userErr || !user) {
      return { success: false, error: 'Unauthorized: Session expired or invalid.' }
    }

    // Someone at an unlocked computer mustn't be able to change it: check the current password first, on a
    // separate client that keeps no session (so it can't replace the signed-in one).
    if (!currentPassword || !user.email) return { success: false, error: 'Type your current password.' }
    const checker = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error: wrongErr } = await checker.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (wrongErr) return { success: false, error: 'Your current password is wrong.' }
    await checker.auth.signOut({ scope: 'local' })
    if (currentPassword === newPassword) return { success: false, error: 'Pick a password different from the current one.' }

    // Update password in Supabase Auth
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    // Record immutable audit entry
    try {
      await supabaseAdmin.from('activity_logs').insert({
        actor_id: user.id,
        action_type: 'SECURITY_UPDATE',
        target_category: 'CREDENTIALS',
        description: 'Administrator rotated their personal access credentials.',
        created_at: new Date().toISOString(),
      })
    } catch (auditErr) {
      console.warn('Non-fatal: Failed to log password rotation audit:', auditErr)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Password rotation error:', err)
    return { success: false, error: err.message || 'An unexpected error occurred while updating your password.' }
  }
}
