'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { login } from "@/app/login/actions"
import { Loader2, Eye, EyeOff, ShieldCheck, Key, ArrowRight } from "lucide-react"
import { useState } from 'react'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const message = searchParams?.get('message')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showCredentialsHelp, setShowCredentialsHelp] = useState(false)

  return (
    <div className="bg-white/5 p-2 rounded-[2rem] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-spring">
      <Card className="border-white/5 bg-[#0a0a0f]/80 backdrop-blur-2xl shadow-2xl rounded-[calc(2rem-0.5rem)] overflow-hidden relative border">
        {/* Glow indicator */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>

        <CardHeader className="space-y-1.5 pb-5 pt-7">
          <CardTitle className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5.5 h-5.5 text-emerald-400" />
            Operator Verification
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs leading-relaxed">
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
              <div className="rounded-xl bg-rose-950/50 p-3 text-xs text-rose-300 border border-rose-800/40 font-semibold flex items-center gap-2">
                <span>⚠️ {message}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Email Address
              </Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="admin@technocycle.com" 
                required 
                className="bg-zinc-950/60 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl h-11 focus-visible:ring-1 transition-all duration-300 ring-offset-zinc-950 shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Input 
                  id="password" 
                  name="password" 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  required 
                  className="bg-zinc-950/60 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl h-11 pr-10 focus-visible:ring-1 transition-all duration-300 ring-offset-zinc-950 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Test Credentials Helper */}
            <div className="pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowCredentialsHelp(!showCredentialsHelp)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Key className="w-3.5 h-3.5 text-emerald-500" />
                {showCredentialsHelp ? "Hide test credentials helper" : "Show test credentials helper"}
              </button>
              
              {showCredentialsHelp && (
                <div className="mt-2.5 p-3.5 bg-zinc-950/40 rounded-xl border border-white/5 space-y-1.5 text-xs text-slate-400 leading-relaxed transition-spring">
                  <p className="font-semibold text-slate-300">
                    Super Admin Profile:
                  </p>
                  <div className="grid grid-cols-[50px_1fr] bg-zinc-950/70 p-2.5 rounded-lg border border-white/5 font-mono text-[11px] text-slate-300">
                    <span className="text-slate-500">Email:</span>
                    <span className="text-emerald-400 font-bold select-all">technosis@admin.com</span>
                    <span className="text-slate-500">Pass:</span>
                    <span className="text-emerald-400 font-bold select-all">admin123</span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-1 leading-normal">
                    *Super Admin accounts are authorized to modify geofence coordinates and statutory tax rules.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="pt-2 pb-6">
            <Button 
              type="submit" 
              className="group w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:opacity-50 text-zinc-950 font-bold py-6 rounded-xl text-sm transition-spring active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 border-0"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-zinc-950" />
                  Signing in...
                </>
              ) : (
                <>
                  Verify & Access
                  <span className="ml-1 w-5 h-5 rounded-full bg-zinc-950/10 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="w-3 h-3 text-zinc-950" />
                  </span>
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
