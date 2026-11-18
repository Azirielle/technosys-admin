import Image from "next/image"
import { Smartphone, Info } from "lucide-react"
import DownloadButton from "@/components/DownloadButton"

export default function AppDownloadPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-zinc-100">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Smartphone className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <Image src="/technocycle-logo-light.png" alt="Technocycle" width={56} height={56} className="h-14 w-auto" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">TechnoSys Technician App</h1>
            <p className="text-blue-100 mt-2 text-sm font-medium">Clock in, manage tickets, and track your location.</p>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
            <h2 className="text-sm font-bold text-blue-900 mb-1">Android Users Only</h2>
            <p className="text-xs text-blue-700">Currently, the mobile app is only available for Android devices.</p>
          </div>

          {/* Downloads the version marked active in app_versions (it was a placeholder link before) */}
          <DownloadButton />

          <div className="border-t border-zinc-100 pt-6">
            <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-zinc-400" />
              Installation Instructions
            </h3>
            <ol className="text-sm text-zinc-600 space-y-3 list-decimal pl-4">
              <li>Tap the <strong>Download App</strong> button above.</li>
              <li>Wait for the download to finish, then tap on the downloaded file.</li>
              <li>If prompted, go to your phone settings and allow <strong>"Install unknown apps"</strong> from your browser.</li>
              <li>Tap <strong>Install</strong> and open the app to log in.</li>
            </ol>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs font-semibold text-zinc-400">
        &copy; {new Date().getFullYear()} TechnoSys. All rights reserved.
      </p>
    </div>
  )
}
