// Toast: short messages after an action ("Leave approved"). Call useToast().show(...) from any client component.
'use client'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cx } from './cx'

type ToastTone = 'success' | 'danger' | 'info'

interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const ICONS = { success: CheckCircle2, danger: AlertCircle, info: Info }
const ICON_COLOUR = { success: 'text-success', danger: 'text-danger', info: 'text-info' }

/** Put once around the app (done in app/layout.tsx). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId.current++
      setItems((list) => [...list.slice(-2), { id, tone, message }])
      setTimeout(() => dismiss(id), tone === 'danger' ? 6000 : 4000)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({ show, success: (m) => show(m, 'success'), error: (m) => show(m, 'danger') }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-[10000] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {items.map((t) => (
          <ToastCard key={t.id} tone={t.tone} message={t.message} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** The look of one toast. Exported so the /ui preview can show it without a timer. */
export function ToastCard({ tone, message, onClose }: { tone: ToastTone; message: string; onClose?: () => void }) {
  const Icon = ICONS[tone]
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className="pointer-events-auto flex items-center gap-3 rounded-pill bg-surface py-2.5 pr-2.5 pl-4 text-small font-medium text-ink shadow-raised animate-smooth-pop"
    >
      <Icon className={cx('size-4.5 shrink-0', ICON_COLOUR[tone])} aria-hidden />
      <span className="min-w-0 flex-1">{message}</span>
      {onClose && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-pill text-ink-3 hover:bg-surface-soft hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider> (see app/layout.tsx).')
  return api
}
