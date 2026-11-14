// Preview of the bigger UI pieces (stat tiles, list card, table, empty state, toast, modal, drawer) for /ui.
'use client'
import { CalendarDays, Clock, MessageSquare, Wrench } from 'lucide-react'
import { useState } from 'react'
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  EmptyState,
  Field,
  Input,
  ListCard,
  ListRow,
  Modal,
  Pagination,
  StatRow,
  StatTile,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  ToastCard,
  useToast,
} from '@/components/ui'

const LEAVES = [
  { id: 'LV-0142', name: 'Juan Dela Cruz', type: 'Sick leave', days: 2, status: 'Pending' as const },
  { id: 'LV-0141', name: 'Pedro Reyes', type: 'Vacation leave', days: 1, status: 'Approved' as const },
  { id: 'LV-0139', name: 'Ramon Santos', type: 'Emergency leave', days: 3, status: 'Rejected' as const },
]
const TONE = { Pending: 'warning', Approved: 'success', Rejected: 'danger' } as const

export function ShowcaseData() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <StatRow className="xl:grid-cols-2">
        <StatTile label="Timed in" value={14} total={18} hint="4 not in yet" tone="warning" icon={Clock} href="#" />
        <StatTile label="Leave waiting" value={3} hint="Oldest is 2 days" icon={CalendarDays} />
        <StatTile label="Open tickets" value={5} hint="2 new today" tone="info" icon={MessageSquare} />
        <StatTile label="Tools out" value={9} hint="1 overdue" tone="danger" icon={Wrench} />
      </StatRow>

      <ListCard title="Leave waiting" count={2} href="#" empty="No leave requests waiting.">
        <ListRow leading={<Avatar name="Juan Dela Cruz" />} primary="Juan Dela Cruz" secondary="Sick leave · 16–17 Nov" badge={<Badge tone="warning">Pending</Badge>} right="2 h ago" />
        <ListRow leading={<Avatar name="Pedro Reyes" />} primary="Pedro Reyes" secondary="Vacation leave · 20 Nov" right="1 day ago" />
      </ListCard>

      <TableContainer>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Request</TableHeaderCell>
              <TableHeaderCell>Employee</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell numeric>Days</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell align="right"> </TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {LEAVES.map((l) => (
              <TableRow key={l.id}>
                <TableCell mono>{l.id}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2.5 font-medium whitespace-nowrap"><Avatar name={l.name} size="xs" />{l.name}</span>
                </TableCell>
                <TableCell className="text-ink-2">{l.type}</TableCell>
                <TableCell numeric>{l.days}</TableCell>
                <TableCell><Badge tone={TONE[l.status]} dot>{l.status}</Badge></TableCell>
                <TableCell align="right"><Button size="sm" variant="ghost">Open</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination currentPage={1} totalPages={4} totalItems={38} itemsPerPage={10} onPageChange={() => {}} itemNamePlural="requests" />
      </TableContainer>

      <div className="rounded-card bg-surface shadow-card">
        <EmptyState icon={MessageSquare} title="No open tickets" description="When a technician files a ticket from the app, it shows up here." action={<Button>Refresh</Button>} />
      </div>

      <div className="flex flex-col gap-2">
        <ToastCard tone="success" message="Leave approved" onClose={() => {}} />
        <ToastCard tone="danger" message="Couldn't save. Check your connection and try again." />
      </div>

      <div className="flex flex-wrap gap-inline">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Button onClick={() => setDrawerOpen(true)}>Open drawer</Button>
        <Button onClick={() => toast.success('Leave approved')}>Show toast</Button>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Approve this leave?"
        subtitle="Juan Dela Cruz · Sick leave · 16–17 Nov"
        icon={CalendarDays}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setModalOpen(false); toast.success('Leave approved') }}>Approve leave</Button>
          </>
        }
      >
        Juan will get a notification on his phone.
      </Modal>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Ticket TK-0088"
        subtitle="Equipment issue · Juan Dela Cruz"
        footer={<Button variant="primary" onClick={() => setDrawerOpen(false)}>Send reply</Button>}
      >
        <Field label="Reply" htmlFor="pv-reply">
          <Input id="pv-reply" placeholder="We'll replace the drill tomorrow." />
        </Field>
      </Drawer>
    </>
  )
}
