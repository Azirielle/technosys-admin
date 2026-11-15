// AccessBoard: the CEO's Temporary access page — who is away today, who can use which extra pages, give or remove access.
'use client'

import { useState } from 'react'
import { usePageCommand } from '@/components/commands/pageCommands'
import { CalendarOff, KeyRound, Plus, ShieldOff, Users, X } from 'lucide-react'
import { resetAllPersistentOverrides } from '@/app/actions/system-overrides'
import type { OverrideMetadataItem, RoleKey } from '@/lib/overrides'
import { LEAVE_LABELS } from '@/lib/labels'
import { formatDayRange } from '@/lib/format'
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  EmptyState,
  IconButton,
  ListRow,
  Modal,
  Page,
  PageHeader,
  StatRow,
  StatTile,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
  SkeletonTableRows,
} from '@/components/ui'
import { useAccess, type Grant } from './useAccess'
import { GiveAccessModal } from './GiveAccessModal'
import { pageName, roleLabel, timeLeft } from './accessConfig'

export function AccessBoard() {
  const toast = useToast()
  const { overrides, metadata, grants, absences, people, loading, saveRole, clearLocal } = useAccess()
  const [giving, setGiving] = useState(false)
  const [removing, setRemoving] = useState<Grant | 'all' | null>(null)
  const [busy, setBusy] = useState(false)

  // Quick actions and the N shortcut open the form straight away.
  usePageCommand(['new'], () => setGiving(true))

  async function give(role: RoleKey, list: string[], meta: Record<string, OverrideMetadataItem>) {
    const res = await saveRole(role, list, { ...(metadata[role] ?? {}), ...meta })
    if (!res.success) return false
    setGiving(false)
    toast.success(`${people[role]} can now open ${Object.keys(meta).map(pageName).join(', ')}`)
    return true
  }

  async function remove() {
    if (!removing) return
    setBusy(true)
    if (removing === 'all') {
      const res = await resetAllPersistentOverrides()
      if (res.success) {
        clearLocal()
        toast.success('All temporary access removed')
      }
      else toast.error(res.error || "Couldn't remove access.")
    } else {
      const { role, moduleId } = removing
      const meta = { ...(metadata[role] ?? {}) }
      delete meta[moduleId]
      const res = await saveRole(role, (overrides[role] ?? []).filter((id) => id !== moduleId), meta)
      if (res.success) toast.success(`${people[role]} can no longer open ${pageName(moduleId)}`)
      else toast.error(res.error || "Couldn't remove access.")
    }
    setBusy(false)
    setRemoving(null)
  }

  const covering = new Set(grants.map((g) => g.role)).size

  return (
    <Page>
      <PageHeader
        title="Temporary access"
        subtitle="When someone is away, let HR or Service Dept use the other department's pages for a while."
        actions={
          <>
            {grants.length > 0 && <Button icon={ShieldOff} onClick={() => setRemoving('all')}>Remove all</Button>}
            <Button variant="primary" icon={Plus} onClick={() => setGiving(true)}>Give access</Button>
          </>
        }
      />

      <StatRow className="xl:grid-cols-3">
        <StatTile loading={loading} icon={KeyRound} label="Extra pages open" value={grants.length} hint={grants.length ? 'Shown below' : 'Everyone is in their own role'} />
        <StatTile loading={loading} icon={Users} label="People covering" value={covering} hint={covering ? [...new Set(grants.map((g) => people[g.role]))].join(', ') : 'Nobody'} />
        <StatTile loading={loading} icon={CalendarOff} label="On leave today" value={absences.length} hint={absences.length ? 'See the list below' : 'Everyone is in'} tone={absences.length ? 'warning' : 'success'} />
      </StatRow>

      <TableContainer>
        {!loading && grants.length === 0 ? (
          <EmptyState icon={KeyRound} title="No temporary access" description="HR and Service Dept can only open their own pages." action={<Button icon={Plus} onClick={() => setGiving(true)}>Give access</Button>} />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Who</TableHeaderCell>
                <TableHeaderCell>Can also open</TableHeaderCell>
                <TableHeaderCell>Reason</TableHeaderCell>
                <TableHeaderCell>Until</TableHeaderCell>
                <TableHeaderCell align="right"><span className="sr-only">Remove</span></TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {loading && <SkeletonTableRows cols={5} />}
              {grants.map((g) => (
                <TableRow key={`${g.role}-${g.moduleId}`}>
                  <TableCell>
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      <Avatar name={people[g.role]} size="xs" />
                      <span><span className="block font-medium">{people[g.role]}</span><span className="block text-caption text-ink-3">{roleLabel(g.role)}</span></span>
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{pageName(g.moduleId)}</TableCell>
                  <TableCell className="text-ink-2">{g.meta.granted_by_name || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-ink-2">{timeLeft(g.meta.expires_at)}</TableCell>
                  <TableCell align="right"><IconButton icon={X} size="sm" label={`Remove ${pageName(g.moduleId)} from ${people[g.role]}`} onClick={() => setRemoving(g)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Card padded={false}>
        <CardHeader className="px-card pt-card pb-3" title="On leave today" count={absences.length} />
        {absences.length === 0 ? (
          <p className="px-card pb-card text-small text-ink-3">No approved leave today.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {absences.map((a) => (
              <ListRow key={a.id} leading={<Avatar name={a.name} />} primary={a.name} secondary={LEAVE_LABELS[a.leaveType] ?? a.leaveType} right={formatDayRange(a.startDate, a.endDate)} />
            ))}
          </ul>
        )}
      </Card>

      <GiveAccessModal isOpen={giving} people={people} current={overrides} onClose={() => setGiving(false)} onSave={give} />
      <Modal
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        icon={ShieldOff}
        iconTone="danger"
        title={removing === 'all' ? 'Remove all temporary access?' : 'Remove this access?'}
        subtitle={removing && removing !== 'all' ? `${people[removing.role]} · ${pageName(removing.moduleId)}` : 'HR and Service Dept go back to their own pages only.'}
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>Keep it</Button>
            <Button variant="danger" loading={busy} onClick={remove}>Remove</Button>
          </>
        }
      >
        <p className="text-small text-ink-2">The page disappears from their menu the next time it loads.</p>
      </Modal>
    </Page>
  )
}
