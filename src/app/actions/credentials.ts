'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function updateAdminPassword(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const newPassword = (formData.get('new_password') as string || '').trim()
    const confirmPassword = (formData.get('confirm_password') as string || '').trim()

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters in length.' }
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'New password and confirmation password do not match.' }
    }

    const supabase = await createClient()
    const { data: { user }, error: userErr } = await supabase.auth.getUser()

    if (userErr || !user) {
      return { success: false, error: 'Unauthorized: Session expired or invalid.' }
    }

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
