// ChatMessage and TypingBubble: one message in a ticket conversation (employee, AI, HR or system note).
'use client'

import { FileText, Lock, ZoomIn } from 'lucide-react'
import { formatTime } from '@/lib/format'
import { Avatar, cx } from '@/components/ui'
import FormattedPolicyDocument from '@/components/policies/FormattedPolicyDocument'
import { isImage, type TicketMessage } from './types'
import { TechyAvatar } from './TechyAvatar'
import { useAttachmentUrl } from './attachmentUrl'

const WHO: Record<string, string> = { admin: 'HR', ai: 'Techy · AI assistant', technician: 'Employee' }

export function ChatMessage({
  message,
  employeeName,
  onOpenImage,
}: {
  message: TicketMessage
  employeeName: string
  onOpenImage: (url: string) => void
}) {
  const attachment = useAttachmentUrl(message.attachment_url) // private storage: a link that works for an hour
  if (message.sender_role === 'system') {
    return (
      <p className="mx-auto w-fit rounded-pill bg-surface-soft px-3 py-1 text-center text-caption text-ink-2">{message.content}</p>
    )
  }

  const fromHr = message.sender_role === 'admin'
  const fromAi = message.sender_role === 'ai'
  const who = fromAi ? WHO.ai : fromHr ? WHO.admin : employeeName

  // HR-only note: the employee never sees it, so it must not look like a reply.
  if (message.is_internal) {
    return (
      <div className="ml-auto max-w-[78%] rounded-card rounded-br-chip border border-dashed border-warning bg-warning-soft px-4 py-3 text-small text-ink">
        <p className="mb-0.5 flex items-center gap-1 text-micro font-medium text-warning">
          <Lock className="size-3" aria-hidden /> HR-only note · {employeeName} can't see this
        </p>
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className="mt-1 text-right text-micro text-ink-3">{formatTime(message.created_at)}</p>
      </div>
    )
  }

  // The company's side (HR and Techy, the AI assistant) is on the right; the employee is on the left
  return (
    <div className={cx('flex items-end gap-2', (fromHr || fromAi) && 'flex-row-reverse')}>
      {fromAi ? <TechyAvatar /> : !fromHr && <Avatar name={employeeName} size="xs" className="size-7" />}
      <div
        className={cx(
          'max-w-[78%] rounded-card px-4 py-3 text-small',
          fromHr ? 'rounded-br-chip bg-action text-on-action' : fromAi ? 'rounded-br-chip bg-info-soft text-ink' : 'rounded-bl-chip bg-surface-soft text-ink',
        )}
      >
        <p className={cx('mb-0.5 text-micro font-medium', fromHr ? 'opacity-70' : 'text-ink-3')}>{who}</p>
        {fromAi ? (
          // The AI writes Markdown and ends with a code the phone turns into a form or button ([FORM:…], [GO:…], old [ACTION:…]); show it without the code.
          <FormattedPolicyDocument content={message.content.replace(/\[\s*(?:FORM|GO|ACTION)\s*:[^\]]*\]/gi, '').trim()} className="text-small" keepStatusLines />
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}

        {attachment &&
          (isImage(message.attachment_url, message.attachment_type) ? (
            <button
              type="button"
              onClick={() => onOpenImage(attachment)}
              className="group relative mt-2 block w-full cursor-zoom-in overflow-hidden rounded-control"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={attachment} alt="Attached photo" className="max-h-44 w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center gap-1 bg-scrim text-caption font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                <ZoomIn className="size-3.5" aria-hidden /> View larger
              </span>
            </button>
          ) : (
            <a href={attachment} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-caption font-medium underline">
              <FileText className="size-3.5" aria-hidden /> Open attached file
            </a>
          ))}

        <p className={cx('mt-1 text-right text-micro', fromHr ? 'opacity-60' : 'text-ink-3')}>{formatTime(message.created_at)}</p>
      </div>
    </div>
  )
}

/** "Juan is typing…" with three moving dots. */
export function TypingBubble({ name }: { name: string }) {
  return (
    <div role="status" aria-live="polite" className="flex w-fit items-center gap-2 rounded-pill bg-surface-soft px-3.5 py-2">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-bounce rounded-pill bg-ink-3" style={{ animationDelay: `${i * 0.16}s` }} />
        ))}
      </span>
      <span className="text-caption text-ink-2">{name} is typing…</span>
    </div>
  )
}
