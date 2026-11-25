import crypto from 'crypto'
import { verifyRoleAccess } from "@/lib/permissions"

/** The signed-in person, if they are HR or the CEO (the only roles that manage policies). */
export async function policyStaff() {
  const { authorized, userId } = await verifyRoleAccess('policies', true)
  return authorized && userId ? { id: userId } : null
}

// Compute SHA-256 hash for content integrity
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content || '').digest('hex')
}
