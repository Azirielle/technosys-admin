'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { login } from "@/app/login/actions"
import { Loader2 } from "lucide-react"
import { useState } from 'react'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const message = searchParams?.get('message')
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
        <CardDescription className="text-zinc-400">
          Enter your admin email and password to login.
        </CardDescription>
      </CardHeader>
      <form action={async (formData) => {
        setIsLoading(true)
        await login(formData)
        setIsLoading(false)
      }}>
        <CardContent className="space-y-4">
          {message && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
              {message}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="admin@hris.com" 
              required 
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="bg-zinc-800/50 border-zinc-700 text-white focus-visible:ring-emerald-500"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-500/20" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
