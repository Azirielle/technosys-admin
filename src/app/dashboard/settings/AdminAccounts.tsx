"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserCheck, Mail, KeyRound, Shield, Trash2, Calendar, Loader2, CheckCircle2, ShieldAlert } from "lucide-react"
import { createAdmin, deleteAdmin } from "@/app/actions/employees"

interface AdminInfo {
  id: string
  fullName: string
  email: string
  role: string
  createdAt: string
}

interface AdminAccountsProps {
  initialAdmins: AdminInfo[]
}

export default function AdminAccounts({ initialAdmins }: AdminAccountsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleRegisterAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const res = await createAdmin(formData)
      if (res?.error) throw new Error(res.error)

      setSuccess(true)
      form.reset()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAdmin = async (id: string) => {
    setDeleting(true)
    try {
      const res = await deleteAdmin(id)
      if (res?.error) {
        alert(res.error)
      } else {
        router.refresh()
      }
    } catch (err: any) {
      alert("Failed to delete administrator: " + err.message)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Left: Admins List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-zinc-200">
            {initialAdmins.map((admin) => {
              const isSuper = admin.role === "super_admin"
              const roleLabels: Record<string, string> = {
                super_admin: "Super Admin",
                admin: "Standard Admin",
                hr: "HR Admin",
                coordinator: "Coordinator",
                accountant: "Accountant",
                supervisor: "Supervisor",
                branch_manager: "Branch Manager",
              }
              const displayRole = roleLabels[admin.role] || admin.role
              return (
                <div key={admin.id} className="p-4 flex items-center justify-between hover:bg-zinc-100/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-sm ${
                      isSuper ? "bg-gradient-to-tr from-purple-600 to-indigo-600" : "bg-gradient-to-tr from-zinc-700 to-zinc-900"
                    }`}>
                      {admin.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-zinc-900 text-sm">{admin.fullName}</h4>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-extrabold uppercase ${
                          isSuper 
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                            : "bg-zinc-100 border-zinc-200 text-zinc-600"
                        }`}>
                          {displayRole}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {admin.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-zinc-400">
                      <p className="flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" /> {new Date(admin.createdAt).toLocaleDateString(undefined, { dateStyle: 'short' })}
                      </p>
                    </div>

                    {!isSuper && (
                      deleteId === admin.id ? (
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => handleDeleteAdmin(admin.id)}
                            disabled={deleting}
                            className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 transition-colors disabled:opacity-50"
                          >
                            {deleting ? "..." : "Confirm"}
                          </button>
                          <button 
                            onClick={() => setDeleteId(null)}
                            disabled={deleting}
                            className="px-2 py-1 bg-zinc-200 text-zinc-700 text-[10px] font-bold rounded hover:bg-zinc-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteId(admin.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                          title="Delete Administrator"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right: Registration Form */}
      <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-xl">
        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-indigo-600" /> Create Administrator Account
        </h3>

        {success && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-start gap-2 text-xs transition-all duration-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Administrator account registered!</p>
              <p className="mt-0.5 text-zinc-600 leading-relaxed">The new administrator can now sign in to this console.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Account Registration Failed</p>
              <p className="mt-0.5 text-rose-600 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleRegisterAdmin} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Full Name</label>
            <div className="relative">
              <UserCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input name="fullName" required type="text" className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-zinc-800" placeholder="e.g. Juan Dela Cruz" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Administrative Role</label>
            <div className="relative">
              <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <select name="role" required className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-zinc-800 appearance-none cursor-pointer">
                <option value="admin">Standard Admin</option>
                <option value="hr">HR Admin</option>
                <option value="coordinator">Coordinator</option>
                <option value="accountant">Accountant</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input name="email" required type="email" className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-zinc-800" placeholder="admin@technocycle.com" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Default Password</label>
            <div className="relative">
              <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input name="password" required type="text" className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-zinc-800" placeholder="AdminPass123!" />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register Administrator"}
          </button>
        </form>
      </div>
    </div>
  )
}
