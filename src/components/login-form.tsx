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

  return (
    <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden relative border">
      {/* Dynamic top glow strip */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-cyan-500/20"></div>

      <CardHeader className="space-y-1.5 pb-5">
        <CardTitle className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          Welcome back
        </CardTitle>
        <CardDescription className="text-zinc-400 text-xs">
          Sign in to access your administrative workspace. Both Standard and Super Administrator profiles use this portal.
        </CardDescription>
      </CardHeader>
      
      <form action={async (formData) => {
        setIsLoading(true)
        await login(formData)
        setIsLoading(false)
      }}>
        <CardContent className="space-y-4">
          {message && (
            <div className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-500 border border-rose-500/20 font-medium">
              ⚠️ {message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
              Email Address
            </Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="admin@hris.com" 
              required 
              className="bg-zinc-950/40 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl h-11 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
              Password
            </Label>
            <div className="relative">
              <Input 
                id="password" 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••"
                required 
                className="bg-zinc-950/40 border-zinc-800 text-white focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl h-11 pr-10 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Test Credentials Helper */}
          <div className="pt-2 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => setShowCredentialsHelp(!showCredentialsHelp)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1.5 transition-colors duration-150"
            >
              <Key className="w-3.5 h-3.5" />
              {showCredentialsHelp ? "Hide test credentials helper" : "Show test credentials helper"}
            </button>
            
            {showCredentialsHelp && (
              <div className="mt-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-1.5 text-xs text-zinc-400 leading-relaxed transition-all duration-300">
                <p>
                  <strong>Super Admin Profile:</strong>
                </p>
                <div className="grid grid-cols-[50px_1fr] bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/50 font-mono text-[11px]">
                  <span className="text-zinc-500">Email:</span>
                  <span className="text-zinc-200">technosis@admin.com</span>
                  <span className="text-zinc-500">Pass:</span>
                  <span className="text-zinc-200">admin123</span>
                </div>
                <p className="text-[10px] text-zinc-500 italic">
                  *Super Admin accounts can manage branch office locations, statutory tax rules, and register standard admin operators.
                </p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-2">
          <Button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-emerald-950/20 border-0"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Secure Sign In'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
