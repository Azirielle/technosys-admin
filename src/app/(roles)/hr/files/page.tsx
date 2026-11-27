// 201 files page. ?show=incomplete (or another tab) opens on that tab (task 5: the overview's numbers open their list).
import { FilesBoard } from '@/components/files/FilesBoard'

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  return <FilesBoard show={(await searchParams).show} />
}
