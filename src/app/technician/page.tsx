import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveAppVersion } from "@/app/actions/app-distribution"
import DownloadButton from "./DownloadButton"
import { Smartphone, ShieldAlert, CheckCircle2, Settings } from "lucide-react"

export default async function TechnicianPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Auth Gate
  if (!user) {
    redirect('/login?next=/technician')
  }

  // Fetch current version info
  const { data: activeVersion } = await getActiveAppVersion()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
            <Smartphone className="h-10 w-10 text-white transform rotate-6" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            TechnoSys App
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Internal Hub for Technicians
          </p>
        </div>

        {activeVersion ? (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-zinc-800 space-y-6">
            
            <div className="text-center space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                v{activeVersion.version_name} is now available
              </span>
              {activeVersion.release_notes && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{activeVersion.release_notes}</p>
              )}
            </div>

            <DownloadButton />
            
            <div className="pt-6 border-t border-zinc-200/80 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-4 text-center">
                Installation Guide
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">1</div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Open the downloaded file</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Tap the completed download notification or find it in your "Downloads" folder.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">2</div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      Bypass Security Warning <ShieldAlert className="w-4 h-4 text-amber-500" />
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">If your phone says "Install blocked", tap <span className="font-semibold text-zinc-700 dark:text-zinc-300">Settings</span> and enable <span className="font-semibold text-zinc-700 dark:text-zinc-300">Allow from this source</span>.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">3</div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      Install & Open <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Tap "Install" then "Open". Log in using your employee credentials!</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border border-zinc-200/80 dark:border-zinc-800 text-center">
            <Settings className="w-12 h-12 text-zinc-400 mx-auto mb-4 animate-spin-slow" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">No Active Release</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">The Admin has not published an app version yet. Please check back later.</p>
          </div>
        )}

      </div>
    </div>
  )
}
