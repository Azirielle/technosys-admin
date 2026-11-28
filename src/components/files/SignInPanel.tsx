// SignInPanel: the "Sign-in" tab of a 201 file — the person's 4-digit PIN, their registered phone,
// and any request to switch to a new phone (HR approves or declines).
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Camera, KeyRound, Lock, RotateCcw, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDay } from '@/lib/format'
import { Badge, Button, Field, Input, SkeletonText, useToast } from '@/components/ui'
import { decidePhoneRequest, loadSignInInfo, resetFace, resetPhone, setPin, type SignInInfo } from './signInActions'
import type { EmployeeFile } from './requirements'
import { enrolledFacePath, selfieLink } from '@/components/today/todayData'

export function SignInPanel({ employee, onChanged }: { employee: EmployeeFile; onChanged: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [info, setInfo] = useState<SignInInfo | null>(null)
  const [pin, setPinValue] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'pin' | 'approve' | 'decline' | 'reset' | 'face' | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const load = useCallback(async () => {
    try {
      setInfo(await loadSignInInfo(supabase, employee.id))
    } catch (err) {
      toast.error(`Couldn't load sign-in details: ${(err as Error).message}`)
    }
  }, [supabase, employee.id, toast])

  // The drawer gives this panel key={employee.id}, so it starts fresh for each person.
  useEffect(() => {
    load()
  }, [load])

  async function act(kind: NonNullable<typeof busy>, task: () => Promise<void>, done: string) {
    setBusy(kind)
    try {
      await task()
      toast.success(done)
      await load()
      onChanged()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
      setConfirmReset(false)
    }
  }

  async function savePin() {
    setBusy('pin')
    const problem = await setPin(supabase, employee.id, employee.full_name, pin)
    setBusy(null)
    setPinError(problem)
    if (problem) return
    setPinValue('')
    toast.success(`New PIN saved. Tell ${employee.full_name.split(' ')[0]} in person.`)
    load()
  }

  if (!info) return <SkeletonText lines={6} />

  return (
    <div className="flex flex-col gap-6">
      {info.request && (
        <section className="rounded-card border border-warning/40 bg-warning-soft p-4">
          <p className="text-small font-medium text-ink">Wants to switch to a new phone</p>
          <p className="mt-1 text-caption text-ink-2">
            {info.request.device_name || 'A phone'} · asked {formatDay(info.request.requested_at)}. Approve only if they told you they changed phones;
            their old phone stops working.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" loading={busy === 'approve'} disabled={!!busy}
              onClick={() => act('approve', () => decidePhoneRequest(supabase, info.request!.id, true, employee.full_name), 'New phone approved')}>
              Approve new phone
            </Button>
            <Button size="sm" variant="ghost" loading={busy === 'decline'} disabled={!!busy}
              onClick={() => act('decline', () => decidePhoneRequest(supabase, info.request!.id, false, employee.full_name), 'Request declined')}>
              Decline
            </Button>
          </div>
        </section>
      )}

      <section>
        <h3 className="flex items-center gap-2 text-small font-medium text-ink"><Smartphone className="size-4" aria-hidden /> Registered phone</h3>
        {info.phone ? (
          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="text-caption text-ink-2">
              {info.phone.device_name || 'Phone'}<br />
              Registered {formatDay(info.phone.registered_at)} · last used {formatDay(info.phone.last_seen_at)}
            </p>
            {confirmReset ? (
              <span className="flex shrink-0 gap-2">
                <Button size="sm" variant="danger" loading={busy === 'reset'} onClick={() => act('reset', () => resetPhone(supabase, employee.id, employee.full_name), 'Phone reset')}>Yes, reset</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
              </span>
            ) : (
              <Button size="sm" variant="ghost" icon={RotateCcw} disabled={!!busy} onClick={() => setConfirmReset(true)}>Reset phone</Button>
            )}
          </div>
        ) : (
          <p className="mt-2 text-caption text-ink-3">No phone yet. They pick their work phone in the app's first-time setup.</p>
        )}
        {confirmReset && (
          <p className="mt-2 text-caption text-ink-3">Their current phone stops working. The next phone they sign in on asks them to make it their work phone.</p>
        )}
        {/* Face check (B15): a bad first photo, or a new look. They save their face again at the next time-in. */}
        <Button size="sm" variant="ghost" icon={RotateCcw} className="mt-2" loading={busy === 'face'} disabled={!!busy}
          onClick={() => act('face', () => resetFace(supabase, employee.id, employee.full_name), 'Face reset: they save it again at their next time-in')}>Reset face</Button>
        {/* The reference photo the phone compares every time-in against (saved at first-time setup). */}
        <Button size="sm" variant="ghost" icon={Camera} className="mt-2" disabled={!!busy}
          onClick={async () => {
            const path = await enrolledFacePath(supabase, employee.id)
            const url = path ? await selfieLink(supabase, path) : null
            if (url) window.open(url, '_blank', 'noopener'); else toast.error(path ? "Couldn't open the photo." : 'No enrolled face yet.')
          }}>View enrolled face</Button>
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-small font-medium text-ink">
          <KeyRound className="size-4" aria-hidden /> Mobile PIN
          {info.pin?.locked && <Badge tone="danger" icon={Lock}>Locked after 5 wrong tries</Badge>}
        </h3>
        <p className="mt-1 text-caption text-ink-3">
          {info.pin ? `Set ${formatDay(info.pin.updated_at)}. Saving a new PIN also unlocks it.` : 'No PIN yet: they can only sign in with email until you set one.'}
        </p>
        <div className="mt-3 flex items-start gap-2">
          <Field label="New 4-digit PIN" htmlFor="new-pin" error={pinError} className="w-40">
            <Input
              id="new-pin"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              placeholder="••••"
              onChange={(e) => { setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && pin.length === 4) savePin() }}
            />
          </Field>
          <Button className="mt-6" variant="primary" loading={busy === 'pin'} disabled={pin.length !== 4 || !!busy} onClick={savePin}>
            Save PIN
          </Button>
        </div>
      </section>
    </div>
  )
}
