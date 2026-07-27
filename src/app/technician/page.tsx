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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
            <Smartphone className="h-10 w-10 text-white transform rotate-6" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            TechnoSys App
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Internal Hub for Technicians
          </p>
        </div>

        {activeVersion ? (
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-6">
            
            <div className="text-center space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                v{activeVersion.version_name} is now available
              </span>
              {activeVersion.release_notes && (
                <p className="text-sm text-gray-500">{activeVersion.release_notes}</p>
              )}
            </div>

            <DownloadButton />
            
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 text-center">
                Installation Guide
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold text-sm">1</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Open the downloaded file</p>
                    <p className="text-xs text-gray-500 mt-1">Tap the completed download notification or find it in your "Downloads" folder.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold text-sm">2</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      Bypass Security Warning <ShieldAlert className="w-4 h-4 text-amber-500" />
                    </p>
                    <p className="text-xs text-gray-500 mt-1">If your phone says "Install blocked", tap <span className="font-semibold text-gray-700">Settings</span> and enable <span className="font-semibold text-gray-700">Allow from this source</span>.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold text-sm">3</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      Install & Open <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Tap "Install" then "Open". Log in using your employee credentials!</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin-slow" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Release</h3>
            <p className="text-gray-500 text-sm">The Admin has not published an app version yet. Please check back later.</p>
          </div>
        )}

      </div>
    </div>
  )
}
