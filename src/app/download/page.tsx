import { Download, Smartphone, Info } from "lucide-react"

export default function AppDownloadPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Smartphone className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <span className="text-3xl font-black text-indigo-700 tracking-tighter">HR</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">TechnoSys Technician App</h1>
            <p className="text-indigo-100 mt-2 text-sm font-medium">Clock in, manage tickets, and track your location.</p>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-center">
            <h2 className="text-sm font-bold text-indigo-900 mb-1">Android Users Only</h2>
            <p className="text-xs text-indigo-700">Currently, the mobile app is only available for Android devices.</p>
          </div>

          <a 
            href="https://example.com/app-release.apk" // TODO: Replace with actual Supabase Storage URL later
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg py-4 rounded-2xl shadow-md transition-all active:scale-[0.98]"
          >
            <Download className="w-6 h-6" />
            Download APK File
          </a>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-slate-400" />
              Installation Instructions
            </h3>
            <ol className="text-sm text-slate-600 space-y-3 list-decimal pl-4">
              <li>Tap the <strong>Download APK File</strong> button above.</li>
              <li>Wait for the download to finish, then tap on the downloaded file.</li>
              <li>If prompted, go to your phone settings and allow <strong>"Install unknown apps"</strong> from your browser.</li>
              <li>Tap <strong>Install</strong> and open the app to log in.</li>
            </ol>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs font-semibold text-slate-400">
        &copy; {new Date().getFullYear()} TechnoSys. All rights reserved.
      </p>
    </div>
  )
}
