"use client"
import { useState } from "react"
import { UserPlus, Briefcase, Mail, KeyRound, Loader2, CheckCircle2 } from "lucide-react"

export default function EmployeesPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleCreateTechnician = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    const form = e.currentTarget
    const formData = new FormData(form)
    const data = {
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
      baseSalary: Number(formData.get("baseSalary"))
    }

    try {
      const res = await fetch("/api/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      
      if (!res.ok) throw new Error(result.error)
      
      setSuccess(true)
      form.reset()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Manage Employees</h1>
        <p className="text-zinc-500 mt-1">Register new technicians to the platform securely.</p>
      </div>

      <div className="max-w-xl bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-6">
          <UserPlus className="w-5 h-5 text-emerald-500" /> Register New Technician
        </h2>

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Technician created successfully!</p>
              <p className="text-sm mt-1">They can now log into the mobile app using their email and password.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleCreateTechnician} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Full Name</label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input name="fullName" required type="text" className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Juan Dela Cruz" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input name="email" required type="email" className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="juan@company.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Default Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input name="password" required type="text" className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Secret123!" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Base Salary (₱)</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input name="baseSalary" required type="number" min="0" className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="25000" />
              </div>
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full mt-6 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Technician Account"}
          </button>
        </form>
      </div>
    </div>
  )
}
