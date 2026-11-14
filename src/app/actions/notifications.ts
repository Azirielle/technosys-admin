'use server'

import { verifyRoleAccess } from '@/lib/permissions'
import { sendPushToUser } from '@/lib/push'

/** Office staff send a push notification to one employee's phone (e.g. "please submit your 201 requirements"). */
export async function notifyEmployee(userId: string, title: string, body: string, type: string) {
  const { authorized } = await verifyRoleAccess('employees')
  if (!authorized) return { success: false, error: 'Not allowed' }
  return sendPushToUser(userId, title, body, { type })
}
