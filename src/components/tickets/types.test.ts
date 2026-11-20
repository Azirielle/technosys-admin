// Test for waitingForHr (the HR overview's "waiting for your reply"). Run from Admin-side: node --test src/components/tickets/types.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { waitingForHr } from './types.ts'

const c = (sender_role: string, created_at: string, is_internal = false) => ({ sender_role, created_at, is_internal })

test('waiting for HR only when HR owes the next reply', () => {
  assert.equal(waitingForHr({ title: 'Tool broken', handling_mode: 'AI', ticket_comments: [] }), true) // form, unanswered
  assert.equal(waitingForHr({ title: 'Tool broken', handling_mode: 'ADMIN', ticket_comments: [c('admin', '2026-11-20T01:00'), c('technician', '2026-11-20T02:00')] }), true)
  assert.equal(waitingForHr({ title: 'Tool broken', handling_mode: 'ADMIN', ticket_comments: [c('technician', '2026-11-20T01:00'), c('admin', '2026-11-20T02:00')] }), false)
  assert.equal(waitingForHr({ title: 'Tool broken', handling_mode: 'ADMIN', ticket_comments: [c('technician', '2026-11-20T01:00'), c('admin', '2026-11-20T02:00', true)] }), true) // HR's note isn't a reply
  assert.equal(waitingForHr({ title: 'Support Conversation', handling_mode: 'AI', ticket_comments: [c('technician', '2026-11-20T01:00')] }), false) // Techy's
  assert.equal(waitingForHr({ title: 'Support Conversation', handling_mode: 'ADMIN', ticket_comments: [c('technician', '2026-11-20T01:00')] }), true)
})
