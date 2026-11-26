'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyRoleAccess } from '@/lib/permissions'
import { sendPushToUser } from '@/lib/push'
import { sendSmsToUser } from '@/lib/sms'

export type AnnouncementAudience = 'all' | 'field_staff' | 'office_staff'
export type AnnouncementStatus = 'draft' | 'scheduled' | 'published'
export type AnnouncementPriority = 'normal' | 'important' | 'urgent'

export interface AnnouncementRow {
  id: string
  title: string
  content: string
  priority: AnnouncementPriority
  status: AnnouncementStatus
  audience: AnnouncementAudience
  scheduled_for: string | null
  send_push: boolean
  is_edited: boolean
  created_by: string | null
  created_at: string
  updated_at: string | null
  last_edited_by: string | null
  author: { full_name: string; role: string } | null
  editor: { full_name: string; role: string } | null
}

const FIELD_ROLES = ['technician', 'helper'] as const
const OFFICE_ROLES = ['ceo', 'hr', 'coordinator'] as const

function rolesFor(audience: AnnouncementAudience) {
  if (audience === 'field_staff') return [...FIELD_ROLES]
  if (audience === 'office_staff') return [...OFFICE_ROLES]
  return [...FIELD_ROLES, ...OFFICE_ROLES]
}

/** All announcements (office staff see drafts and scheduled ones too). */
export async function listAnnouncements(): Promise<{ data: AnnouncementRow[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('announcements')
    .select('*, author:profiles!announcements_created_by_fkey(full_name, role), editor:profiles!announcements_last_edited_by_fkey(full_name, role)')
    .order('created_at', { ascending: false })
  if (error) return { data: [], error: error.message }
  return { data: (data || []) as unknown as AnnouncementRow[] }
}

/** How many active staff each audience reaches (shown before publishing). */
export async function getAudienceCounts(): Promise<Record<AnnouncementAudience, number>> {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('lifecycle_status', 'active')
  const roles = (data || []).map((p) => p.role as string)
  const field = roles.filter((r) => (FIELD_ROLES as readonly string[]).includes(r)).length
  const office = roles.filter((r) => (OFFICE_ROLES as readonly string[]).includes(r)).length
  return { all: field + office, field_staff: field, office_staff: office }
}

export async function saveAnnouncement(input: {
  id?: string | null
  title: string
  content: string
  priority: AnnouncementPriority
  status: AnnouncementStatus
  audience: AnnouncementAudience
  scheduled_for: string | null
  send_push: boolean
}): Promise<{ success: boolean; error?: string }> {
  const { authorized, userId } = await verifyRoleAccess('broadcaster', true)
  if (!authorized || !userId) return { success: false, error: 'You are not allowed to post announcements.' }

  const title = input.title.trim()
  const content = input.content.trim()
  if (!title || !content) return { success: false, error: 'Title and message are required.' }
  if (input.status === 'scheduled' && !input.scheduled_for) return { success: false, error: 'Pick a date and time to publish.' }
  // A minute's slack for the time it takes to click Save (C7: Jan 23, 2025 could be scheduled)
  if (input.status === 'scheduled' && Date.parse(input.scheduled_for!) < Date.now() - 60000) return { success: false, error: 'Pick a time in the future, or publish it now.' }

  const values = {
    title,
    content,
    priority: input.priority,
    status: input.status,
    audience: input.audience,
    scheduled_for: input.status === 'scheduled' ? input.scheduled_for : null,
    send_push: input.send_push,
  }

  let wasPublished = false
  if (input.id) {
    const { data: before } = await supabaseAdmin.from('announcements').select('status').eq('id', input.id).single()
    wasPublished = before?.status === 'published'
    const { error } = await supabaseAdmin
      .from('announcements')
      .update({ ...values, is_edited: true, last_edited_by: userId, updated_at: new Date().toISOString() })
      .eq('id', input.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabaseAdmin.from('announcements').insert({ ...values, created_by: userId })
    if (error) return { success: false, error: error.message }
  }

  // Push only when it goes live for the first time (not on every edit, not for drafts).
  if (input.status === 'published' && input.send_push && !wasPublished) {
    const { data: recipients } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('lifecycle_status', 'active')
      .in('role', rolesFor(input.audience))
    await Promise.all((recipients || []).map((r) => sendPushToUser(r.id, title, content.slice(0, 150), { type: 'announcement' })))
  }
  // Urgent ones also go by SMS (office closed, typhoon…); normal and important stay push-only to save credits
  if (input.status === 'published' && input.priority === 'urgent' && !wasPublished) {
    const { data: recipients } = await supabaseAdmin
      .from('profiles').select('id').eq('lifecycle_status', 'active').in('role', rolesFor(input.audience))
    await Promise.all((recipients || []).map((r) => sendSmsToUser(r.id, `URGENT: ${title}. ${content}`.slice(0, 300), 'ANNOUNCEMENT')))
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
  const { authorized } = await verifyRoleAccess('broadcaster', true)
  if (!authorized) return { success: false, error: 'You are not allowed to remove announcements.' }
  const { error } = await supabaseAdmin.from('announcements').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/', 'layout')
  return { success: true }
}
