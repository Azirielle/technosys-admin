'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { login, sendOtp, verifyOtpAction } from "@/app/login/actions"
import { Loader2, Eye, EyeOff, ShieldCheck, User } from "lucide-react"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from "framer-motion"

export default function LoginForm() {
  const searchParams = useSearchParams()
  const message = searchParams?.get('message')
  const isTechnicianPortal = searchParams?.get('next') === '/technician'
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Phone/OTP state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [localError, setLocalError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [cooldown])

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
        setLocalError('')
        if (isTechnicianPortal) {
          if (!otpSent) {
            const res = await sendOtp(formData)
            if (res?.error) setLocalError(res.error)
            else if (res?.success) {
              setOtpSent(true)
              setCooldown(60)
            }
          } else {
            await verifyOtpAction(formData)
          }
        } else {
          await login(formData)
        }
        setIsLoading(false)
      }}>
        <CardContent className="space-y-5 px-8">
          <input type="hidden" name="next" value={searchParams?.get('next') || ''} />
          <AnimatePresence>
            {(message || localError) && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="rounded-2xl bg-red-50/80 backdrop-blur-md p-4 text-xs text-red-600 border border-red-100/50 font-bold overflow-hidden"
              >
                ⚠️ {message || localError}
              </motion.div>
            )}
          </AnimatePresence>

          {!isTechnicianPortal ? (
            <>
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
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-500 text-[10px] font-extrabold uppercase tracking-widest ml-1">
                  Phone Number
                </Label>
                <div className="flex bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500/50 overflow-hidden">
                  <span className="flex items-center px-4 bg-white/40 border-r border-white/40 text-slate-500 text-sm font-bold">
                    +63
                  </span>
                  <Input 
                    id="phone" 
                    name="phone" 
                    type="tel" 
                    placeholder="9171234567" 
                    required 
                    maxLength={10}
                    pattern="[0-9]{10}"
                    value={phone}
                    disabled={otpSent}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="bg-transparent border-0 text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 rounded-none h-12 px-4 font-mono shadow-none"
                  />
                </div>
              </div>

              {otpSent && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="otp" className="text-slate-500 text-[10px] font-extrabold uppercase tracking-widest ml-1">
                      6-Digit OTP Code
                    </Label>
                    <Input 
                      id="otp" 
                      name="otp" 
                      type="text" 
                      placeholder="123456"
                      required 
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="bg-white/50 backdrop-blur-sm border-white/40 text-slate-900 focus-visible:ring-blue-500/30 focus-visible:border-blue-500/50 rounded-2xl h-12 px-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-300 font-mono tracking-widest text-center text-lg"
                    />
                  </div>
                  <div className="text-center">
                    <button 
                      type="button" 
                      onClick={async () => {
                        if (cooldown > 0) return;
                        setIsLoading(true);
                        setLocalError('');
                        const formData = new FormData();
                        formData.append('phone', phone);
                        const res = await sendOtp(formData);
                        if (res?.error) setLocalError(res.error);
                        else setCooldown(60);
                        setIsLoading(false);
                      }} 
                      disabled={cooldown > 0 || isLoading} 
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-40 uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend OTP Code'}
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </CardContent>
        
        <CardFooter className="pt-4 pb-8 px-8 flex flex-col items-center">
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
              ) : isTechnicianPortal ? (
                otpSent ? 'Verify OTP' : 'Send OTP'
              ) : (
                'Secure Login'
              )}
            </Button>
          </motion.div>
          {isTechnicianPortal && (
             <div 
               className="mt-6 text-[9px] text-slate-300 hover:text-slate-400 font-mono tracking-widest cursor-pointer select-none transition-colors duration-300"
               onClick={() => {
                 const url = new URL(window.location.href);
                 url.searchParams.delete('next');
                 window.location.href = url.pathname + url.search;
               }}
               title="v0.1.0-build"
             >
               v0.1.0-build
             </div>
          )}
        </CardFooter>
      </form>
    </Card>
    </motion.div>
  )
}

