// HelpButton: the "?" beside a page's title. Opens short steps for that page (text in helpText.ts).
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { CircleHelp } from 'lucide-react'
// Straight from the files, not '@/components/ui': PageHeader (in ui) shows this button
import { Drawer } from '@/components/ui/Drawer'
import { IconButton } from '@/components/ui/Button'
import { HELP } from './helpText'

export function HelpButton() {
  const [open, setOpen] = useState(false)
  const help = HELP[usePathname().split('/')[2] ?? 'overview']
  if (!help) return null
  return (
    <>
      <IconButton icon={CircleHelp} label={`How to use ${help.title}`} variant="ghost" size="sm" onClick={() => setOpen(true)} />
      <Drawer isOpen={open} onClose={() => setOpen(false)} title={`How to use: ${help.title}`} subtitle="Short steps for this page." width="md">
        <ol className="flex list-decimal flex-col gap-3 pl-5 text-body text-ink">
          {help.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </Drawer>
    </>
  )
}
