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
    <Card className="border-slate-200 bg-white shadow-xl rounded-2xl overflow-hidden relative border">
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
              <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs text-slate-500 leading-relaxed transition-all duration-300">
                <p>
                  <strong>Super Admin Profile:</strong>
                </p>
                <div className="grid grid-cols-[50px_1fr] bg-white p-2 rounded-lg border border-slate-200 font-mono text-[11px]">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-800 font-bold">technosis@admin.com</span>
                  <span className="text-slate-400">Pass:</span>
                  <span className="text-slate-800 font-bold">admin123</span>
                </div>
                <p className="text-[10px] text-slate-400 italic mt-1">
                  *Super Admin accounts are authorized to modify geofence coordinates and statutory tax rules.
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
