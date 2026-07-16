"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { registerAppVersion } from "@/app/actions/app-distribution"
import { UploadCloud, CheckCircle2, Loader2, AlertCircle } from "lucide-react"

export default function AppUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [versionName, setVersionName] = useState("")
  const [releaseNotes, setReleaseNotes] = useState("")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      // Auto-fill version if not set
      if (!versionName) {
        // e.g. extract "1.0.4" from "app-release-1.0.4.apk"
        const name = e.target.files[0].name.replace('.apk', '').replace('app-release-', '')
        setVersionName(name)
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !versionName) return

    setUploading(true)
    setStatus("idle")
    setErrorMessage("")
    setProgress(0)

    try {
      // 1. Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("app-releases")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) throw new Error(uploadError.message)

      setProgress(100)

      // 2. Register version in database
      const res = await registerAppVersion(versionName, uploadData.path, releaseNotes)
      
      if (res.error) {
        throw new Error(res.error)
      }

      setStatus("success")
      setFile(null)
      setVersionName("")
      setReleaseNotes("")
    } catch (err: any) {
      setStatus("error")
      setErrorMessage(err.message || "An unknown error occurred")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Upload New APK</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            APK File
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative hover:bg-gray-50 transition-colors">
            <div className="space-y-1 text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600 justify-center">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" accept=".apk" className="sr-only" onChange={handleFileChange} disabled={uploading} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                {file ? file.name : "Android APK up to 500MB"}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Version Name
          </label>
          <input 
            type="text" 
            value={versionName}
            onChange={e => setVersionName(e.target.value)}
            disabled={uploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. 1.0.4"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Release Notes (Optional)
          </label>
          <textarea 
            value={releaseNotes}
            onChange={e => setReleaseNotes(e.target.value)}
            disabled={uploading}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="What's new in this version?"
          />
        </div>

        {status === 'error' && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md flex items-start gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="p-3 bg-green-50 text-green-700 rounded-md flex items-start gap-2 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p>App version uploaded and registered successfully!</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || !versionName || uploading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
              Uploading... {progress > 0 && progress < 100 ? `${progress}%` : ''}
            </>
          ) : (
            "Publish Release"
          )}
        </button>
      </div>
    </div>
  )
}
