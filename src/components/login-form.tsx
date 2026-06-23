'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { login } from "@/app/login/actions"
import { Loader2, Eye, EyeOff, ShieldCheck, Key } from "lucide-react"
import { useState } from 'react'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const message = searchParams?.get('message')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showCredentialsHelp, setShowCredentialsHelp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const testAccounts = [
    { role: 'Super Admin', email: 'technosis@admin.com', pass: 'password123', color: 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100/50' },
    { role: 'CEO', email: 'carlos.ceo@technocycle.com', pass: 'password123', color: 'bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100/50' },
    { role: 'COO', email: 'corazon.coo@technocycle.com', pass: 'password123', color: 'bg-violet-50 border-violet-100 text-violet-700 hover:bg-violet-100/50' },
    { role: 'HR Manager', email: 'helena.hr@technocycle.com', pass: 'password123', color: 'bg-teal-50 border-teal-100 text-teal-700 hover:bg-teal-100/50' },
    { role: 'Coordinator (Aileen)', email: 'aileen.admin@technocycle.com', pass: 'password123', color: 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100/50' },
    { role: 'Accountant', email: 'alicia.accountant@technocycle.com', pass: 'password123', color: 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100/50' },
    { role: 'Branch Manager', email: 'benjamin.manager@technocycle.com', pass: 'password123', color: 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100/50' },
    { role: 'Supervisor', email: 'santiago.supervisor@technocycle.com', pass: 'password123', color: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' },
  ]

  const handleFillCredentials = (testEmail: string, testPass: string) => {
    setEmail(testEmail)
    setPassword(testPass)
  }

  return (
    <Card className="border-slate-200 bg-white shadow-xl rounded-2xl overflow-hidden relative border w-full max-w-md mx-auto">
      {/* Premium top brand identifier bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500"></div>

      <CardHeader className="space-y-1 pb-5 pt-7">
        <CardTitle className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5.5 h-5.5 text-emerald-600" />
          Operator Verification
        </CardTitle>
        <CardDescription className="text-slate-500 text-xs leading-relaxed">
          Sign in to access secure corporate configurations. Standard Admins and Super Admins share this authentication gateway.
        </CardDescription>
      </CardHeader>
      
      <form action={async (formData) => {
        setIsLoading(true)
        await login(formData)
        setIsLoading(false)
      }}>
        <CardContent className="space-y-4">
          {message && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100 font-bold">
              ⚠️ {message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-600 text-xs font-extrabold uppercase tracking-wider">
              Email Address
            </Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="admin@technocycle.com" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 rounded-xl h-11 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-600 text-xs font-extrabold uppercase tracking-wider">
              Password
            </Label>
            <div className="relative">
              <Input 
                id="password" 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••"
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-white border-slate-200 text-slate-900 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 rounded-xl h-11 pr-10 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Test Credentials Helper */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCredentialsHelp(!showCredentialsHelp)}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer flex items-center gap-1 transition-colors duration-150"
            >
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              {showCredentialsHelp ? "Hide test credentials helper" : "Show test credentials helper"}
            </button>
            
            {showCredentialsHelp && (
              <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col gap-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select a role to auto-fill:</p>
                <div className="grid grid-cols-2 gap-2">
                  {testAccounts.map((acc) => (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => handleFillCredentials(acc.email, acc.pass)}
                      className={`px-3 py-2.5 rounded-xl border text-[11px] font-bold text-left transition-all duration-150 cursor-pointer flex flex-col justify-center gap-0.5 active:scale-95 ${acc.color}`}
                    >
                      <span>{acc.role}</span>
                      <span className="text-[9px] opacity-75 font-normal truncate block w-full">{acc.email}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 italic">
                  *Clicking any profile above will auto-fill the login credentials. Password for all test accounts is `password123`.
                </p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-2 pb-6">
          <Button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-emerald-600/10 border-0"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Verify & Access'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

