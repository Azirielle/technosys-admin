import { getActiveAppVersion } from "@/app/actions/app-distribution"
import AppUploader from "./Uploader"
import QRCodeWidget from "./QRCodeWidget"
import { ShieldCheck, CalendarClock, Info } from "lucide-react"

export default async function AppManagementPage() {
  const { data: activeVersion, error } = await getActiveAppVersion()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mobile App Distribution</h1>
        <p className="text-gray-500 mt-1">Manage the Android APK for technicians. New uploads are instantly pushed to the download portal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Uploader & Current Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                Active Release Status
              </h2>
            </div>
            
            <div className="p-6">
              {activeVersion ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 text-green-800 rounded-lg border border-green-100">
                    <div>
                      <p className="font-semibold text-lg">v{activeVersion.version_name}</p>
                      <p className="text-sm opacity-80 flex items-center gap-1 mt-1">
                        <CalendarClock className="w-4 h-4" /> 
                        Released on {new Date(activeVersion.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full uppercase tracking-wider">Live</span>
                  </div>
                  
                  {activeVersion.release_notes && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Release Notes</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md whitespace-pre-wrap border border-gray-100">
                        {activeVersion.release_notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Info className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No active app version found.</p>
                  <p className="text-sm text-gray-400 mt-1">Upload an APK to distribute it to the technicians.</p>
                </div>
              )}
            </div>
          </div>

          <AppUploader />
        </div>

        {/* Right Column - QR Code */}
        <div className="space-y-6">
          <QRCodeWidget />
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">How it works</h3>
            <ul className="text-sm text-gray-600 space-y-3">
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mr-2 shrink-0 mt-0.5">1</span>
                Upload your built .apk file here.
              </li>
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mr-2 shrink-0 mt-0.5">2</span>
                Technicians scan the QR code to open the portal.
              </li>
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mr-2 shrink-0 mt-0.5">3</span>
                They log in using their employee credentials to generate a secure download link.
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  )
}
