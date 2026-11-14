// HandbookModal: every published policy in one document, with a contents list and Print / Save as PDF.
'use client'

import { BookOpen, Printer } from 'lucide-react'
import type { CompanyPolicy } from '@/app/actions/policies'
import { formatLongDate } from '@/lib/format'
import { Button, EmptyState, Modal } from '@/components/ui'
import FormattedPolicyDocument from './FormattedPolicyDocument'
import { categoryLabel, todayYmd } from './policyLabels'

export function HandbookModal({ isOpen, policies, onClose }: { isOpen: boolean; policies: CompanyPolicy[]; onClose: () => void }) {
  if (!isOpen) return null
  const published = policies.filter((p) => p.status === 'active').sort((a, b) => a.title.localeCompare(b.title))

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={BookOpen}
      title="Employee handbook"
      subtitle={`All ${published.length} published policies, as of ${formatLongDate(todayYmd())}`}
      maxWidth="4xl"
      contentHeight="h-[90vh]"
      headerExtra={<Button size="sm" icon={Printer} onClick={() => window.print()} disabled={published.length === 0}>Print or save as PDF</Button>}
    >
      {published.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nothing published yet" description="Published policies are collected here into one handbook." />
      ) : (
        <div className="flex flex-col gap-8">
          <nav aria-label="Contents" className="rounded-control bg-surface-soft p-4">
            <p className="mb-2 text-caption font-medium text-ink-3">Contents</p>
            <ol className="list-decimal pl-5 text-small text-ink">
              {published.map((p) => (
                <li key={p.id}>
                  <a href={`#handbook-${p.id}`} className="hover:underline">{p.title}</a>
                  <span className="text-ink-3"> · {categoryLabel(p.category)}</span>
                </li>
              ))}
            </ol>
          </nav>
          {published.map((p, i) => (
            <article key={p.id} id={`handbook-${p.id}`} className="border-t border-line pt-6">
              <p className="text-caption text-ink-3">{i + 1}. {categoryLabel(p.category)} · {p.version}</p>
              <h2 className="mt-1 text-heading font-semibold text-ink">{p.title}</h2>
              {p.summary && <p className="mt-2 text-small text-ink-2">{p.summary}</p>}
              <div className="mt-4">
                {/* The text often repeats the title as its first heading; drop it since it's shown above. */}
                <FormattedPolicyDocument content={p.content_markdown.replace(/^#\s+.*\n+/, '')} />
              </div>
            </article>
          ))}
        </div>
      )}
    </Modal>
  )
}
