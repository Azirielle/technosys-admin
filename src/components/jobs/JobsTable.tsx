// JobsTable: one row per job: client and address, dates and hours, where the crew reports, who's on it,
// and its status. Click a row to open the job.
'use client'

import { ArrowRight, Briefcase, Building2, MapPin } from 'lucide-react'
import { AvatarStack, Badge, Button, EmptyState, SkeletonTableRows, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui'
import { STATUS, clock, dateRange, type Job } from './jobTypes'
import { VipTag } from '@/components/jobs/VipTag'
import { PriorityBadge } from './PriorityBadge'
import { WorkTypeBadge } from './WorkTypeBadge'

export function JobsTable({ jobs, loading, onOpen, empty }: { jobs: Job[]; loading: boolean; onOpen: (job: Job) => void; empty: string }) {
  if (!loading && jobs.length === 0) return <EmptyState icon={Briefcase} title={empty} description="New jobs you schedule show here." />
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Job</TableHeaderCell>
          <TableHeaderCell>When</TableHeaderCell>
          <TableHeaderCell>Report to</TableHeaderCell>
          <TableHeaderCell>Crew</TableHeaderCell>
          <TableHeaderCell>Priority</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell align="right"><span className="sr-only">Open</span></TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {loading && <SkeletonTableRows cols={7} />}
        {!loading && jobs.map((job) => {
          const lead = job.members.find((m) => m.role === 'lead')
          const status = STATUS[job.status]
          return (
            <TableRow key={job.id} onClick={() => onOpen(job)}>
              <TableCell>
                <span className="flex items-center gap-1.5 font-medium">
                  {job.is_vip && <VipTag />}
                  <WorkTypeBadge workType={job.work_type} className="text-[10px] py-0 px-1.5" />
                  {job.client_name}
                </span>
                <span className="block max-w-xs truncate text-caption text-ink-3">{job.address}</span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-ink-2">
                <span className="block">{dateRange(job.start_date, job.end_date)}</span>
                <span className="block text-caption text-ink-3">{clock(job.start_time)}–{clock(job.end_time)}</span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-ink-2">
                <span className="flex items-center gap-1.5">
                  {job.report_to === 'hq' ? <Building2 className="size-3.5" aria-hidden /> : <MapPin className="size-3.5" aria-hidden />}
                  {job.report_to === 'hq' ? 'Office first' : 'Straight to site'}
                </span>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <AvatarStack people={job.members.map((m) => ({ name: m.name }))} max={4} />
                  <span className="text-caption text-ink-3">{lead ? `Lead: ${lead.name.split(' ')[0]}` : 'No lead'}</span>
                </span>
              </TableCell>
              <TableCell><PriorityBadge job={job} /></TableCell>
              <TableCell><Badge tone={status.tone} dot>{status.label}</Badge></TableCell>
              <TableCell align="right"><Button size="sm" variant="ghost" iconRight={ArrowRight}>Open</Button></TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
