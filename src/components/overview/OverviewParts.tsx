import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

const TZ = 'Asia/Manila'

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

export function formatDay(isoOrYmd: string) {
  const d = isoOrYmd.length === 10 ? new Date(`${isoOrYmd}T12:00:00+08:00`) : new Date(isoOrYmd)
  return new Intl.DateTimeFormat('en-PH', { timeZone: TZ, day: 'numeric', month: 'short' }).format(d)
}

export function formatAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** Page frame: same padding and header on every overview. */
export function OverviewPage({ title, subtitle, date, children }: { title: string; subtitle: string; date: string; children: ReactNode }) {
  const longDate = new Intl.DateTimeFormat('en-PH', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${date}T12:00:00+08:00`)
  )
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-7 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-[#121215] dark:text-[#F4F4F6]">{title}</h1>
            <p className="text-sm text-[#575762] dark:text-[#B0B2BD] mt-1">{subtitle}</p>
          </div>
          <p className="text-sm font-medium text-[#575762] dark:text-[#B0B2BD]">{longDate}</p>
        </header>
        {children}
      </div>
    </div>
  )
}

type Tone = 'neutral' | 'good' | 'attention' | 'alert'

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-[#575762] dark:text-[#B0B2BD]',
  good: 'text-emerald-700 dark:text-emerald-400',
  attention: 'text-amber-700 dark:text-amber-400',
  alert: 'text-rose-700 dark:text-rose-400',
}

/** One number with a label; links to the page where you act on it. */
export function StatTile({ label, value, hint, tone = 'neutral', icon: Icon, href }: {
  label: string
  value: ReactNode
  hint?: string
  tone?: Tone
  icon: LucideIcon
  href?: string
}) {
  const body = (
    <div className="h-full rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#2B2C35] p-5 transition-colors hover:border-black/[0.12] dark:hover:border-white/[0.16]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#575762] dark:text-[#B0B2BD]">{label}</span>
        <Icon className="w-4 h-4 text-[#8E8D9A]" aria-hidden />
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-[#121215] dark:text-[#F4F4F6] tabular-nums">{value}</div>
      {hint && <p className={`mt-1 text-xs font-medium ${TONE_TEXT[tone]}`}>{hint}</p>}
    </div>
  )
  return href ? <Link href={href} className="block focus-visible:outline-2 focus-visible:outline-[#4D55CC] rounded-2xl">{body}</Link> : body
}

export function StatRow({ children }: { children: ReactNode }) {
  return <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{children}</section>
}

/** A titled card holding a short list. */
export function Panel({ title, count, href, linkLabel = 'Open', empty, children }: {
  title: string
  count?: number
  href?: string
  linkLabel?: string
  empty: string
  children?: ReactNode
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children
  return (
    <section className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#2B2C35] flex flex-col min-h-[220px]">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="text-[15px] font-semibold text-[#121215] dark:text-[#F4F4F6]">
          {title}
          {typeof count === 'number' && <span className="ml-2 text-[#8E8D9A] font-medium">{count}</span>}
        </h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-[#4D55CC] dark:text-[#818cf8] hover:underline">
            {linkLabel} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {hasRows ? (
        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06] border-t border-black/[0.05] dark:border-white/[0.06]">{children}</ul>
      ) : (
        <p className="flex-1 flex items-center justify-center px-5 pb-6 text-sm text-[#8E8D9A] text-center">{empty}</p>
      )}
    </section>
  )
}

export function PanelRow({ primary, secondary, right, badge }: { primary: ReactNode; secondary?: ReactNode; right?: ReactNode; badge?: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-[#121215] dark:text-[#F4F4F6] truncate">{primary}</span>
          {badge}
        </div>
        {secondary && <p className="text-xs text-[#575762] dark:text-[#B0B2BD] truncate mt-0.5">{secondary}</p>}
      </div>
      {right && <div className="shrink-0 text-xs text-[#575762] dark:text-[#B0B2BD] tabular-nums">{right}</div>}
    </li>
  )
}

const BADGE: Record<Tone, string> = {
  neutral: 'bg-black/[0.05] text-[#575762] dark:bg-white/[0.08] dark:text-[#B0B2BD]',
  good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  attention: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  alert: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
}

/** Status label: always a word, colour only supports it. */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[tone]}`}>{children}</span>
}

export const LEAVE_LABELS: Record<string, string> = {
  sick: 'Sick leave',
  vacation: 'Vacation leave',
  emergency: 'Emergency leave',
  wedding: 'Wedding leave',
  maternal: 'Maternity leave',
  paternal: 'Paternity leave',
  unpaid: 'Unpaid leave',
}

export const JOB_STATUS: Record<string, { label: string; tone: Tone }> = {
  scheduled: { label: 'Scheduled', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'attention' },
  ongoing: { label: 'In progress', tone: 'attention' },
  completed: { label: 'Done', tone: 'good' },
}
