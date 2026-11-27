// Test for waitingForHr (the HR overview's "waiting for your reply"). Run from Admin-side: node --test src/components/tickets/types.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { attachmentPlace, needsAttention, waitingForHr } from './types.ts'

const c = (sender_role: string, created_at: string, is_internal = false) => ({ sender_role, created_at, is_internal })

test('waiting for HR only when HR owes the next reply', () => {
  assert.equal(waitingForHr({ title: 'Tool broken', handling_mode: 'AI', ticket_comments: [] }), true) // form, unanswered
  assert.equal(waitingForHr({ title: 'Tool broken', handling_mode: 'ADMIN', ticket_comments: [c('admin', '2026-11-20T01:00'), c('technician', '2026-11-20T02:00')] }), true)
  assert.equal(waitingForHr({ title: 'Tool broken', handling_mode: 'ADMIN', ticket_comments: [c('technician', '2026-11-20T01:00'), c('admin', '2026-11-20T02:00')] }), false)
  assert.equal(waitingForHr({ title: 'Tool broken', handling_mode: 'ADMIN', ticket_comments: [c('technician', '2026-11-20T01:00'), c('admin', '2026-11-20T02:00', true)] }), true) // HR's note isn't a reply
  assert.equal(waitingForHr({ title: 'Support Conversation', handling_mode: 'AI', ticket_comments: [c('technician', '2026-11-20T01:00')] }), false) // Techy's
  assert.equal(waitingForHr({ title: 'Support Conversation', handling_mode: 'ADMIN', ticket_comments: [c('technician', '2026-11-20T01:00')] }), true)
})

// needsAttention: HR's "Needs HR" tab (audit 27 Nov: plain Techy chats were counted)
const t = (title: string, status: string, handling_mode: string | null) => ({ id: 'x', employee_id: 'e', title, category: 'c', description: '', status, priority: 'medium', handling_mode, created_at: '' })
test('needs HR: concerns and taken-over chats, not chats Techy is answering', () => {
  assert.equal(needsAttention(t('Support Conversation', 'open', 'AI')), false) // Techy is answering
  assert.equal(needsAttention(t('Support Conversation', 'in_progress', 'ADMIN')), true) // HR took it over
  assert.equal(needsAttention(t('DTR check: Sun, Nov 22', 'open', 'AI')), true) // a chat that became a DTR concern
  assert.equal(needsAttention(t('DTR check: Sun, Nov 22', 'resolved', 'ADMIN')), false) // done
})

// attachmentPlace: new messages save a path, older ones a full public link (photos went private on 28 Nov)
test('attachment place from a path or an old public link', () => {
  assert.deepEqual(attachmentPlace('u1/123.jpg'), { bucket: 'ticket_attachments', path: 'u1/123.jpg' })
  assert.deepEqual(attachmentPlace('https://x.supabase.co/storage/v1/object/public/ticket_attachments/admin_1/9_a%20b.png'), { bucket: 'ticket_attachments', path: 'admin_1/9_a b.png' })
  assert.deepEqual(attachmentPlace('https://x.supabase.co/storage/v1/object/public/chat-attachments/u2/1.jpg?t=1'), { bucket: 'chat-attachments', path: 'u2/1.jpg' })
  assert.equal(attachmentPlace('https://example.com/file.pdf'), null)
})
