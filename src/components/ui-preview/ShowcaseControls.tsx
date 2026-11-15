// Preview of the small UI pieces (buttons, fields, badges, tabs, avatars) for the hidden /ui page.
'use client'
import { Check, Download, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  IconButton,
  Input,
  SearchSelect,
  Select,
  StatusDot,
  Tabs,
  Textarea,
} from '@/components/ui'

const CREW = [{ name: 'Ramon Santos' }, { name: 'Juan Dela Cruz' }, { name: 'Pedro Reyes' }, { name: 'Ana Lopez' }, { name: 'Mark Cruz' }, { name: 'Lea Tan' }]

export function ShowcaseControls() {
  const [tab, setTab] = useState<'all' | 'pending' | 'approved'>('pending')
  const [person, setPerson] = useState('')

  return (
    <>
      <Card>
        <CardHeader title="Buttons" subtitle="One primary per area. Secondary is the default." />
        <div className="mt-4 flex flex-wrap items-center gap-inline">
          <Button variant="primary" icon={Check}>Approve leave</Button>
          <Button icon={Download}>Export</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger" icon={Trash2}>Delete</Button>
          <Button variant="primary" loading>Saving</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-inline">
          <Button size="sm" variant="primary">Small</Button>
          <Button size="sm">Small</Button>
          <Button size="lg" variant="primary" icon={Plus}>Large</Button>
          <IconButton icon={Plus} label="Add" variant="primary" />
          <IconButton icon={Search} label="Search" variant="secondary" />
          <IconButton icon={Trash2} label="Delete" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Form fields" />
        <div className="mt-4 grid grid-cols-1 gap-stack sm:grid-cols-2">
          <Field label="Search" htmlFor="pv-search">
            <Input id="pv-search" icon={Search} placeholder="Name or ticket number" />
          </Field>
          <Field label="Leave type" htmlFor="pv-type">
            <Select
              id="pv-type"
              placeholder="All types"
              options={[
                { value: 'sick', label: 'Sick leave' },
                { value: 'vacation', label: 'Vacation leave' },
              ]}
            />
          </Field>
          <Field label="Borrowed by (SearchSelect)" htmlFor="pv-person" hint="Type part of a name">
            <SearchSelect
              id="pv-person"
              value={person}
              onChange={setPerson}
              placeholder="Type a name"
              options={CREW.map((c, i) => ({ value: c.name, label: c.name, hint: i === 0 ? 'Senior' : i % 2 ? 'Technician' : 'Helper' }))}
            />
          </Field>
          <Field label="Mobile number" htmlFor="pv-phone" hint="11 digits, starts with 09" required>
            <Input id="pv-phone" placeholder="09171234501" />
          </Field>
          <Field label="Reason" htmlFor="pv-reason" error="Reason must be at least 10 characters.">
            <Input id="pv-reason" defaultValue="Late" invalid />
          </Field>
          <Field label="Note to employee" htmlFor="pv-note" className="sm:col-span-2">
            <Textarea id="pv-note" rows={3} placeholder="Your leave is approved. Get well soon." />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Badges, tabs and avatars" />
        <div className="mt-4 flex flex-wrap items-center gap-inline">
          <Badge>Draft</Badge>
          <Badge tone="warning" dot>Pending</Badge>
          <Badge tone="success" dot>Approved</Badge>
          <Badge tone="danger" dot>Rejected</Badge>
          <Badge tone="info">Drafted by AI</Badge>
          <StatusDot tone="success">Timed in</StatusDot>
          <StatusDot tone="danger">Outside site</StatusDot>
        </div>
        <div className="mt-4">
          <Tabs
            label="Leave status"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'all', label: 'All', count: 12 },
              { value: 'pending', label: 'Pending', count: 3 },
              { value: 'approved', label: 'Approved' },
            ]}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Avatar name="Helena Garcia" size="lg" />
          <Avatar name="Juan Dela Cruz" size="md" />
          <Avatar name="Pedro Reyes" />
          <Avatar name="Ramon Santos" size="xs" />
          <AvatarStack people={CREW} />
        </div>
      </Card>
    </>
  )
}
