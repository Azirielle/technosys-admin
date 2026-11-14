import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Sends a push notification to every phone a person has registered (push_tokens table, written by the mobile app).
 * Never throws: a failed push must not undo the change that triggered it.
 */
export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    const { data: rows } = await supabaseAdmin.from('push_tokens').select('token').eq('user_id', userId)
    const tokens = (rows || []).map((r) => r.token).filter((t) => t?.startsWith('ExponentPushToken['))
    if (tokens.length === 0) return { success: false, error: 'No registered device' }

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(tokens.map((to) => ({ to, sound: 'default', title, body, data }))),
    })
    if (!res.ok) return { success: false, error: await res.text() }
    return { success: true }
  } catch (e: any) {
    console.error('Push notification failed:', e?.message || e)
    return { success: false, error: e?.message || String(e) }
  }
}
