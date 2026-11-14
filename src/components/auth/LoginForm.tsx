// LoginForm: username and password for the admin. The button shows a spinner while signing in.
'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react'
import { login } from '@/app/login/actions'
import { Button, Field, IconButton, Input } from '@/components/ui'

/** Separate component so it can read the form's pending state. */
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" size="lg" fullWidth loading={pending} iconRight={ArrowRight}>
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  )
}

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={login} className="flex flex-col gap-stack">
      <Field label="Username" htmlFor="username">
        <Input id="username" name="username" icon={User} autoComplete="username" spellCheck={false} required placeholder="Your username" />
      </Field>
      <Field label="Password" htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="Your password"
            className="[&_input]:pr-11"
          />
          <IconButton
            icon={showPassword ? EyeOff : Eye}
            label={showPassword ? 'Hide password' : 'Show password'}
            size="sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => setShowPassword((v) => !v)}
          />
        </div>
      </Field>
      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
