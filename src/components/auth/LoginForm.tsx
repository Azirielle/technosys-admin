'use client'

import { useState } from 'react'
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { login } from '@/app/login/actions'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form className="space-y-4 pt-1" action={login} autoComplete="off">
      <div className="space-y-3.5">
        
        {/* Username or Email Input */}
        <div className="space-y-1.5 text-left">
          <label 
            htmlFor="username" 
            className="block text-xs font-semibold tracking-wide text-slate-200"
          >
            Username or Email
          </label>
          <div className="relative flex items-center rounded-xl bg-[#0C162A]/70 border border-white/15 shadow-inner focus-within:border-sky-400 focus-within:bg-[#0F1C36]/90 focus-within:ring-2 focus-within:ring-sky-400/30 transition-all duration-200">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 z-10">
              <User className="h-4 w-4 transition-colors" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              spellCheck={false}
              required
              placeholder="e.g. CEO, hr@technocycle.ph"
              className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none bg-transparent font-medium"
            />
          </div>
        </div>

        {/* Password Input with Visibility Eye Toggle */}
        <div className="space-y-1.5 text-left">
          <label 
            htmlFor="password" 
            className="block text-xs font-semibold tracking-wide text-slate-200"
          >
            Password
          </label>
          <div className="relative flex items-center rounded-xl bg-[#0C162A]/70 border border-white/15 shadow-inner focus-within:border-sky-400 focus-within:bg-[#0F1C36]/90 focus-within:ring-2 focus-within:ring-sky-400/30 transition-all duration-200">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 z-10">
              <Lock className="h-4 w-4 transition-colors" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none bg-transparent font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all z-10 cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Primary Submit Action */}
      <div className="pt-2">
        <button
          type="submit"
          className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-3 px-4 text-sm font-bold tracking-wide shadow-lg shadow-blue-900/40 border border-white/20 active:scale-[0.98] transition-all duration-150 cursor-pointer overflow-hidden"
        >
          <span>Sign In to Dashboard</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </form>
  )
}
