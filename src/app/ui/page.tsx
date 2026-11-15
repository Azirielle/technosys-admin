// Hidden preview page (/ui): every UI library piece in light and dark, side by side, to check consistency.
import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui'
import { ShowcaseControls } from '@/components/ui-preview/ShowcaseControls'
import { ShowcaseData } from '@/components/ui-preview/ShowcaseData'
import { ShowcaseLoading } from '@/components/ui-preview/ShowcaseLoading'

export const metadata: Metadata = { title: 'UI library · TechnoSys' }

function Column({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div className={`${theme} flex flex-col gap-section rounded-modal bg-bg p-6 text-ink`}>
      <p className="text-caption font-medium text-ink-3">{theme === 'light' ? 'Light' : 'Dark'}</p>
      <ShowcaseControls />
      <ShowcaseData />
      <ShowcaseLoading />
    </div>
  )
}

export default function UiPreviewPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-section px-page py-page-y">
        <PageHeader
          title="UI library"
          subtitle="Every piece from src/components/ui, in light and dark. Pages use only these. See the README in that folder."
        />
        <div className="grid grid-cols-1 gap-section xl:grid-cols-2">
          <Column theme="light" />
          <Column theme="dark" />
        </div>
      </div>
    </div>
  )
}
