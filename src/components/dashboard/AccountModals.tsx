// AccountModals: the pop-up opened from your name in the menu (your name and role on top, then Change password
// and Sign out), plus the Change password and Sign out windows it leads to.
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ChevronRight, KeyRound, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateAdminPassword } from '@/app/actions/credentials'
import { Avatar, Button, Field, Input, Modal, cx } from '@/components/ui'
import { MIN_PASSWORD, passwordProblem } from '@/lib/password' // same rule as the server

type Step = 'account' | 'password' | 'signout' | null


function ActionRow({ icon: Icon, label, danger, onClick }: { icon: typeof KeyRound; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-focus',
        danger ? 'hover:bg-danger-soft' : 'hover:bg-surface-soft',
      )}
    >
      <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-pill', danger ? 'bg-danger-soft text-danger' : 'bg-surface-soft text-ink-2')}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className={cx('min-w-0 flex-1 text-small font-medium', danger ? 'text-danger' : 'text-ink')}>{label}</span>
      <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
    </button>
  )
}

export function AccountModals({ open, onClose, name, title }: { open: boolean; onClose: () => void; name: string; title: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // The account pop-up shows whenever the menu asks for it, unless one of its windows is open.
  const shown: Step = step ?? (open ? 'account' : null)

  function closeAll() {
    setStep(null)
    setPasswordError(null)
    setPasswordSaved(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    onClose()
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    if (!currentPassword) return setPasswordError('Type your current password.')
    const problem = passwordProblem(newPassword)
    if (problem) return setPasswordError(problem)
    if (newPassword !== confirmPassword) return setPasswordError("The two passwords don't match.")
    setSaving(true)
    try {
      const form = new FormData()
      form.append('current_password', currentPassword)
      form.append('new_password', newPassword)
      form.append('confirm_password', confirmPassword)
      const res = await updateAdminPassword(form)
      if (!res.success) setPasswordError(res.error || "Couldn't change the password. Try again.")
      else {
        setPasswordSaved(true)
        setTimeout(closeAll, 1500)
      }
    } catch (err) {
      setPasswordError((err as Error).message || "Couldn't change the password. Try again.")
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    setSigningOut(true)
    try {
      await createClient().auth.signOut()
    } finally {
      router.push('/login')
    }
  }

  return (
    <>
      <Modal isOpen={shown === 'account'} onClose={closeAll} leading={<Avatar name={name} size="md" />} title={name} subtitle={title} maxWidth="sm">
        <div className="flex flex-col gap-1">
          <ActionRow icon={KeyRound} label="Change password" onClick={() => setStep('password')} />
          <ActionRow icon={LogOut} label="Sign out" danger onClick={() => setStep('signout')} />
        </div>
      </Modal>

      <Modal isOpen={shown === 'password'} onClose={closeAll} title="Change password" subtitle={`Use at least ${MIN_PASSWORD} characters.`} icon={KeyRound}>
        <form onSubmit={savePassword} className="flex flex-col gap-stack">
          {passwordError && (
            <p role="alert" className="flex items-center gap-2 rounded-control bg-danger-soft p-3 text-small text-danger">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              {passwordError}
            </p>
          )}
          {passwordSaved && (
            <p className="flex items-center gap-2 rounded-control bg-success-soft p-3 text-small text-success">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              Password changed.
            </p>
          )}
          <Field label="Current password" htmlFor="current-password">
            <Input id="current-password" type="password" required autoFocus value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field label="New password" htmlFor="new-password">
            <Input id="new-password" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Type it again" htmlFor="confirm-password">
            <Input id="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <div className="flex justify-end gap-inline pt-2">
            <Button variant="ghost" onClick={() => setStep('account')}>Back</Button>
            <Button type="submit" variant="primary" loading={saving}>Save password</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={shown === 'signout'}
        onClose={closeAll}
        title="Sign out?"
        subtitle="You'll need your username and password to come back in."
        icon={LogOut}
        iconTone="danger"
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStep('account')}>Stay signed in</Button>
            <Button variant="danger" onClick={signOut} loading={signingOut}>Sign out</Button>
          </>
        }
      >
        {null}
      </Modal>
    </>
  )
}
