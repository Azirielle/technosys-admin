"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Briefcase, Mail, KeyRound, Loader2, CheckCircle2, Trash2, Calendar, ShieldAlert } from "lucide-react"
import { deleteTechnician, TechnicianInfo } from "@/app/actions/employees"

interface EmployeesClientProps {
  initialTechnicians: TechnicianInfo[]
}

export default function EmployeesClient({ initialTechnicians }: EmployeesClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
      router.refresh() // Reload server side data (list of technicians)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await deleteTechnician(id)
      if (res.error) {
        alert(res.error)
      } else {
        router.refresh()
      }
    } catch (err: any) {
      alert("Failed to delete technician: " + err.message)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const formatPhp = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount)
  }

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Manage Employees</h1>
          <p className="text-zinc-500 mt-1">Register, monitor, and remove field technicians securely.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Registered Technicians List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" /> Active Technicians ({initialTechnicians.length})
              </h2>
            </div>

            {initialTechnicians.length === 0 ? (
              <div className="p-12 text-center">
                <UserPlus className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-600 font-semibold">No registered technicians found</p>
                <p className="text-sm text-zinc-400 mt-1">Use the registration panel to create an account.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {initialTechnicians.map((tech) => (
                  <div key={tech.id} className="p-6 flex items-center justify-between hover:bg-zinc-50/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      {/* Initial circle avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-extrabold shadow-sm ring-2 ring-white">
                        {tech.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">{tech.fullName}</h3>
                        <p className="text-sm text-zinc-500 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3.5 h-3.5" /> {tech.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-mono text-zinc-950 font-bold text-sm tracking-tight">{formatPhp(tech.baseSalary)}</p>
                        <p className="text-xs text-zinc-400 flex items-center justify-end gap-1 mt-1">
                          <Calendar className="w-3 h-3" /> {new Date(tech.createdAt).toLocaleDateString(undefined, { dateStyle: 'short' })}
                        </p>
                      </div>

                      {deleteId === tech.id ? (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleDelete(tech.id)}
                            disabled={deleting}
                            className="px-2.5 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                          >
                            {deleting ? "..." : "Confirm"}
                          </button>
                          <button 
                            onClick={() => setDeleteId(null)}
                            disabled={deleting}
                            className="px-2.5 py-1.5 bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg hover:bg-zinc-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteId(tech.id)}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                          title="Delete Technician"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Registration Panel */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-6">
            <UserPlus className="w-5 h-5 text-emerald-500" /> Register Technician
          </h2>

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-start gap-3 transition-all duration-300 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Technician registered successfully!</p>
                <p className="text-sm mt-1">Their profile has been configured, and they can sign in to the mobile application immediately.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Registration Failed</p>
                <p className="text-xs mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateTechnician} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Full Name</label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <input name="fullName" required type="text" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm" placeholder="Juan Dela Cruz" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <input name="email" required type="email" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm" placeholder="juan@gmail.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Default Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <input name="password" required type="text" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm" placeholder="123123123" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Base Salary (₱)</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <input name="baseSalary" required type="number" min="0" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm font-mono" placeholder="25000" />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full mt-6 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Technician Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
