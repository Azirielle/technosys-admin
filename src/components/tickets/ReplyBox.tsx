// ReplyBox: where HR types a reply to the employee (or an HR-only note), with an optional file. Enter sends.
'use client'

import { useRef } from 'react'
import { Lock, Paperclip, Send, X } from 'lucide-react'
import { Button, Checkbox, IconButton, Input, useToast } from '@/components/ui'
import { ALLOWED_FILE_TYPES, checkAttachment } from './ticketActions'

export function ReplyBox({
  text,
  file,
  sending,
  internal,
  employeeName,
  onTextChange,
  onFileChange,
  onInternalChange,
  onSend,
}: {
  text: string
  file: File | null
  sending: boolean
  /** On: the message is an HR-only note the employee never sees. */
  internal: boolean
  employeeName: string
  onTextChange: (text: string) => void
  onFileChange: (file: File | null) => void
  onInternalChange: (internal: boolean) => void
  onSend: () => void
}) {
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const canSend = (text.trim().length > 0 || file !== null) && !sending

  function pickFile(picked: File | undefined) {
    if (fileInput.current) fileInput.current.value = ''
    if (!picked) return
    const problem = checkAttachment(picked)
    if (problem) toast.error(problem)
    else onFileChange(picked)
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line p-3">
      {file && (
        <div className="flex w-fit max-w-full items-center gap-2 rounded-pill bg-surface-soft py-1 pr-1 pl-3 text-caption text-ink-2">
          <Paperclip className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{file.name}</span>
          <IconButton icon={X} label="Remove file" size="sm" className="size-6" onClick={() => onFileChange(null)} />
        </div>
      )}
      <form
        className="flex items-center gap-inline"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSend) onSend()
        }}
      >
        <input ref={fileInput} type="file" accept={ALLOWED_FILE_TYPES} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        <IconButton icon={Paperclip} label="Attach a file" variant="secondary" onClick={() => fileInput.current?.click()} />
        <Input
          className="flex-1"
          aria-label={internal ? 'HR-only note' : 'Reply'}
          placeholder={internal ? 'Write a note only HR can see' : 'Write a reply to the employee'}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
        />
        <Button type="submit" variant="primary" icon={internal ? Lock : Send} loading={sending} disabled={!canSend}>
          {internal ? 'Add note' : 'Send'}
        </Button>
      </form>
      <Checkbox
        checked={internal}
        onChange={(e) => onInternalChange(e.target.checked)}
        label={`HR-only note (${employeeName} won't see it)`}
      />
    </div>
  )
}
