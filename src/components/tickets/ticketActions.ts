// Ticket writes from the HR Tickets page: take over from the AI, send a reply (with a file), resolve or close.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { Ticket, TicketMessage } from './types'

type Client = SupabaseClient<Database>

/** The mobile app listens on this channel for new messages, ticket changes and typing. */
export const SHARED_CHANNEL = 'system-updates'

export const ALLOWED_FILE_TYPES = 'image/png,image/jpeg,image/webp,.pdf,.doc,.docx,.xlsx,.xls'
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx']
const MAX_FILE_BYTES = 5 * 1024 * 1024

/** Returns an error sentence, or null when the file can be sent. */
export function checkAttachment(file: File): string | null {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) return 'Attach a photo (PNG, JPG), PDF, Word or Excel file.'
  if (file.size > MAX_FILE_BYTES) return 'The file must be 5 MB or smaller.'
  return null
}

async function notifyApp(supabase: Client, ticketId: string, events: ('new_comment' | 'ticket_update')[]) {
  const channel = supabase.channel(SHARED_CHANNEL)
  for (const event of events) {
    await channel.send({ type: 'broadcast', event, payload: { ticket_id: ticketId } })
  }
}

async function currentUserId(supabase: Client) {
  const { data } = await supabase.auth.getUser()
  return data.user?.id as string
}

/** HR answers from now on; the AI stops replying in this ticket. */
export async function takeOverTicket(supabase: Client, ticket: Ticket) {
  const { error } = await supabase.from('tickets').update({ handling_mode: 'ADMIN', status: 'in_progress' }).eq('id', ticket.id)
  if (error) throw error
  await supabase.from('ticket_comments').insert({
    ticket_id: ticket.id,
    content: 'HR has joined the chat. The AI assistant is now off for this ticket.',
    sender_role: 'system',
    author_id: await currentUserId(supabase),
  })
  await notifyApp(supabase, ticket.id, ['new_comment', 'ticket_update'])
}

/**
 * Uploads the file (if any) and adds HR's message. Returns the saved message.
 * `internal` makes it an HR-only note: the access rules hide it from the employee and no push is sent.
 */
export async function sendReply(
  supabase: Client,
  ticket: Ticket,
  text: string,
  file: File | null,
  internal = false,
): Promise<TicketMessage | null> {
  const authorId = await currentUserId(supabase)
  let attachmentUrl: string | null = null
  let attachmentType: string | null = null

  if (file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `admin_${authorId || 'staff'}/${Date.now()}_${safeName}`
    const { error } = await supabase.storage.from('ticket_attachments').upload(path, file, { contentType: file.type })
    if (error) throw error
    attachmentUrl = supabase.storage.from('ticket_attachments').getPublicUrl(path).data.publicUrl
    attachmentType = file.type || 'application/octet-stream'
  }

  const { data, error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticket.id,
      author_id: authorId,
      content: text.trim() || (file ? `Attached: ${file.name}` : ''),
      sender_role: 'admin',
      is_internal: internal,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
    })
    .select()
    .single()
  if (error) throw error
  if (!internal) await notifyApp(supabase, ticket.id, ['new_comment'])
  return data as TicketMessage
}

/**
 * Marks the ticket resolved or closed and posts HR's note to the employee.
 * Returns the status it ended with (someone else may have finished it first).
 */
export async function finishTicket(supabase: Client, ticket: Ticket, outcome: 'resolved' | 'closed', note: string) {
  const { data: latest } = await supabase.from('tickets').select('status').eq('id', ticket.id).single()
  if (latest?.status === 'resolved' || latest?.status === 'closed') return { status: latest.status, alreadyDone: true }

  const { error } = await supabase.from('tickets').update({ status: outcome, handling_mode: 'ADMIN' }).eq('id', ticket.id)
  if (error) throw error

  const heading = outcome === 'resolved' ? 'Resolved by HR.' : 'Closed by HR.'
  const fallback = outcome === 'resolved' ? 'Your concern has been resolved.' : 'This ticket was closed.'
  await supabase.from('ticket_comments').insert({
    ticket_id: ticket.id,
    author_id: await currentUserId(supabase),
    content: `${heading}\n\n${note.trim() || fallback}`,
    sender_role: 'admin',
  })
  await notifyApp(supabase, ticket.id, ['ticket_update', 'new_comment'])
  return { status: outcome, alreadyDone: false }
}
