// NotificationBell: floating bell for the admin screens. Shows new requests and flags, and can pop up desktop alerts.
'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, CalendarClock, MessageSquare, ScanFace, Wrench, type LucideIcon } from 'lucide-react'
import { Button, Drawer, EmptyState, IconButton, cx } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { loadFeed, type FeedItem, type FeedRole } from './notificationFeed'
import type { CommandDetail, PageCommand } from '@/components/commands/pageCommands'

/** Already on that page: a ?do=open link wouldn't reload it, so tell the page directly (same event as Quick actions). */
function openHere(e: { preventDefault: () => void }, href: string) {
  const url = new URL(href, window.location.origin)
  const command = url.searchParams.get('do') as PageCommand | null
  if (!command || url.pathname !== window.location.pathname) return
  e.preventDefault()
  const detail: CommandDetail = { path: url.pathname, command, id: url.searchParams.get('id') ?? undefined }
  window.dispatchEvent(new CustomEvent<CommandDetail>('admin-page-command', { detail }))
}

const ICONS: Record<FeedItem['kind'], LucideIcon> = { ticket: MessageSquare, leave: CalendarClock, tool: Wrench, face: ScanFace }

function ago(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  if (min < 1440) return `${Math.floor(min / 60)} h ago`
  return `${Math.floor(min / 1440)} d ago`
}

const canNotify = () => typeof window !== 'undefined' && 'Notification' in window

export function NotificationBell({ role }: { role: FeedRole }) {
  const supabase = useMemo(() => createClient(), [])
  const seenKey = `@technocycle_notif_seen_${role}`
  const [items, setItems] = useState<FeedItem[]>([])
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<string | null>(null)
  const [perm, setPerm] = useState<NotificationPermission | null>(null)
  const prevIds = useRef<Set<string> | null>(null)

  const reload = useCallback(async () => {
    const next = await loadFeed(supabase, role)
    const prev = prevIds.current
    // The very first load is not "new", so it never pops an alert.
    if (prev && canNotify() && Notification.permission === 'granted') {
      for (const it of next.filter((i) => !prev.has(i.id))) {
        const n = new Notification(it.title, { body: it.body, tag: it.id })
        n.onclick = () => {
          window.focus()
          if (it.href) window.location.assign(it.href)
        }
      }
    }
    prevIds.current = new Set(next.map((i) => i.id))
    setItems(next)
  }, [supabase, role])

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(seenKey))
    } catch {}
    if (canNotify()) setPerm(Notification.permission)
  }, [seenKey])

  useEffect(() => {
    reload()
    const channel = supabase.channel(`notif-${role}-${Date.now()}`)
    for (const table of ['tickets', 'leaves', 'reviews']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => reload()) // added or handled: the list stays current
    }
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, role, reload])

  const isNew = (it: FeedItem) => !seen || it.at > seen
  const unread = items.filter(isNew).length

  // Highlights keep the old "seen" time while the panel is open; it only moves forward on close.
  const openPanel = () => {
    setOpen(true)
    try {
      localStorage.setItem(seenKey, new Date().toISOString())
    } catch {}
  }
  const closePanel = () => {
    setOpen(false)
    try {
      setSeen(localStorage.getItem(seenKey))
    } catch {}
  }

  const turnOn = async () => setPerm(await Notification.requestPermission())

  return (
    <>
      <div className="fixed top-5 right-5 z-40">
        <IconButton icon={Bell} label="Notifications" variant="secondary" className="shadow-card" onClick={openPanel} />
        {unread > 0 && (
          <span className="pointer-events-none absolute -top-1 -right-1 min-w-4 rounded-pill bg-danger-solid px-1 text-center text-micro font-medium text-on-action">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>

      <Drawer isOpen={open} onClose={closePanel} title="Notifications" subtitle="New requests and flags from the last 14 days" width="md">
        {perm === 'default' && (
          <div className="mb-4">
            <Button variant="secondary" size="sm" icon={Bell} onClick={turnOn}>
              Turn on desktop notifications
            </Button>
          </div>
        )}
        {perm === 'denied' && <p className="mb-4 text-small text-ink-3">Desktop notifications are blocked in this browser&apos;s settings.</p>}
        {perm === 'granted' && <p className="mb-4 text-small text-ink-3">Desktop notifications are on.</p>}

        {items.length === 0 ? (
          <EmptyState title="Nothing new in the last 14 days." />
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((it) => {
              const Icon = ICONS[it.kind]
              const row = (
                <>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-surface-soft text-ink-2">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-small font-semibold text-ink">{it.title}</span>
                    <span className="block text-small text-ink-2">{it.body}</span>
                    <span className="block text-micro text-ink-3">{ago(it.at)}</span>
                  </span>
                  {isNew(it) && <span className="mt-1.5 size-2 shrink-0 rounded-pill bg-danger-solid" />}
                </>
              )
              const cls = cx('flex items-start gap-3 rounded-control px-3 py-2.5', isNew(it) && 'bg-surface-soft')
              return (
                <li key={it.id}>
                  {it.href ? (
                    <Link href={it.href} onClick={(e) => { closePanel(); openHere(e, it.href!) }} className={cx(cls, 'hover:bg-surface-soft')}>
                      {row}
                    </Link>
                  ) : (
                    <div className={cls}>{row}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Drawer>
    </>
  )
}

export default NotificationBell
