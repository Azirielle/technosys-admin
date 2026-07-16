'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { login } from "@/app/login/actions"
import { Loader2, Eye, EyeOff, ShieldCheck, Key, User } from "lucide-react"
import { useState } from 'react'
import { motion, AnimatePresence } from "framer-motion"

export default function LoginForm() {
  const searchParams = useSearchParams()
  const message = searchParams?.get('message')
  const isTechnicianPortal = searchParams?.get('next') === '/technician'
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
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="border-white/50 bg-white/60 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden relative border w-full max-w-md mx-auto ring-1 ring-black/5">
        
        <CardHeader className="space-y-1 pb-5 pt-8 px-8">
          <CardTitle className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            {isTechnicianPortal ? <User className="w-5 h-5 text-blue-600" /> : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
            {isTechnicianPortal ? "Employee Verification" : "Operator Verification"}
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs leading-relaxed font-medium">
            {isTechnicianPortal 
              ? "Please sign in with your employee credentials to access the internal app download portal."
              : "Sign in to access secure corporate configurations. Standard Admins and Super Admins share this authentication gateway."}
          </CardDescription>
        </CardHeader>
      
      <form action={async (formData) => {
        setIsLoading(true)
        await login(formData)
        setIsLoading(false)
      }}>
        <CardContent className="space-y-5 px-8">
          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="rounded-2xl bg-red-50/80 backdrop-blur-md p-4 text-xs text-red-600 border border-red-100/50 font-bold overflow-hidden"
              >
                ⚠️ {message}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-500 text-[10px] font-extrabold uppercase tracking-widest ml-1">
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
              className="bg-white/50 backdrop-blur-sm border-white/40 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 rounded-2xl h-12 px-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-300"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-500 text-[10px] font-extrabold uppercase tracking-widest ml-1">
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
                className="bg-white/50 backdrop-blur-sm border-white/40 text-slate-900 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 rounded-2xl h-12 px-4 pr-10 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-300"
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
          <div className="pt-4 mt-2">
            <button
              type="button"
              onClick={() => setShowCredentialsHelp(!showCredentialsHelp)}
              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1.5 transition-colors duration-150 ml-1"
            >
              <Key className="w-3 h-3" />
              {showCredentialsHelp ? "Hide Dev Accounts" : "Show Dev Accounts"}
            </button>
            
            <AnimatePresence>
              {showCredentialsHelp && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-5 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 flex flex-col gap-3 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Select an identity:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {testAccounts.map((acc) => (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          key={acc.role}
                          type="button"
                          onClick={() => handleFillCredentials(acc.email, acc.pass)}
                          className={`px-3 py-3 rounded-2xl border text-[11px] font-bold text-left transition-all duration-150 cursor-pointer flex flex-col justify-center gap-0.5 ${acc.color}`}
                        >
                          <span>{acc.role}</span>
                          <span className="text-[9px] opacity-75 font-normal truncate block w-full">{acc.email}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
        
        <CardFooter className="pt-4 pb-8 px-8">
          <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              type="submit" 
              className={`w-full text-white font-bold py-6 rounded-2xl text-[13px] tracking-wide transition-all duration-300 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-lg border border-white/20 ${isTechnicianPortal ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:shadow-blue-500/25' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-500/25'}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Secure Login'
              )}
            </Button>
          </motion.div>
        </CardFooter>
      </form>
    </Card>
    </motion.div>
  )
}

