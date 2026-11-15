// ToolsTable: every tool with its stock and status, plus Lend / Edit / Delete.
'use client'

import { useState } from 'react'
import { HandHelping, Package, Pencil, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  SkeletonTableRows,
} from '@/components/ui'
import { LOW_STOCK, TOOL_STATUS, type Tool } from './types'

/** Tool photo, or a plain icon when there is none or the link is broken. */
function ToolPhoto({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false)
  if (!url || broken) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-soft text-ink-3">
        <Package className="size-4" aria-hidden />
      </span>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" onError={() => setBroken(true)} className="size-10 shrink-0 rounded-control object-cover" />
}

function Stock({ tool }: { tool: Tool }) {
  const out = tool.available_stock <= 0
  const low = !out && tool.available_stock <= LOW_STOCK
  return (
    <span className="inline-flex items-center justify-end gap-2">
      {out && <Badge tone="danger">None left</Badge>}
      {low && <Badge tone="warning">Low</Badge>}
      <span className="font-medium tabular-nums">{tool.available_stock}</span>
      <span className="text-ink-3 tabular-nums">of {tool.total_stock}</span>
    </span>
  )
}

export function ToolsTable({
  tools,
  loading,
  filtered,
  onLend,
  onEdit,
  onDelete,
}: {
  tools: Tool[]
  loading: boolean
  /** true when search or category is narrowing the list (changes the empty message). */
  filtered: boolean
  onLend: (tool: Tool) => void
  onEdit: (tool: Tool) => void
  onDelete: (tool: Tool) => void
}) {
  if (!loading && tools.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={filtered ? 'No tools match' : 'No tools yet'}
        description={filtered ? 'Try another search or category.' : 'Add the tools in the warehouse so you can lend them to crews.'}
      />
    )
  }
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Tool</TableHeaderCell>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell numeric>In warehouse</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell align="right"><span className="sr-only">Actions</span></TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {loading && (
          <SkeletonTableRows cols={5} />
        )}
        {!loading &&
          tools.map((tool) => {
            const status = TOOL_STATUS[tool.status] ?? TOOL_STATUS.active
            return (
              <TableRow key={tool.id}>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <ToolPhoto url={tool.image_url} />
                    <span className="min-w-0">
                      <span className="block font-medium">{tool.name}</span>
                      {tool.serial_number && <span className="block font-mono text-caption text-ink-3">{tool.serial_number}</span>}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-ink-2">{tool.category}</TableCell>
                <TableCell numeric><Stock tool={tool} /></TableCell>
                <TableCell><Badge tone={status.tone} dot>{status.label}</Badge></TableCell>
                <TableCell align="right">
                  <span className="flex items-center justify-end gap-1">
                    <Button size="sm" icon={HandHelping} disabled={tool.available_stock <= 0 || tool.status !== 'active'} onClick={() => onLend(tool)}>
                      Lend
                    </Button>
                    <IconButton icon={Pencil} label={`Edit ${tool.name}`} size="sm" onClick={() => onEdit(tool)} />
                    <IconButton icon={Trash2} label={`Delete ${tool.name}`} size="sm" onClick={() => onDelete(tool)} />
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
      </TableBody>
    </Table>
  )
}
