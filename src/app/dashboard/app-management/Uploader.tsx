"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { registerAppVersion } from "@/app/actions/app-distribution"
import { UploadCloud, CheckCircle2, Loader2, AlertCircle, Link as LinkIcon } from "lucide-react"

export default function AppUploader() {
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file")
  const [file, setFile] = useState<File | null>(null)
  const [externalUrl, setExternalUrl] = useState("")
  const [versionName, setVersionName] = useState("")
  const [releaseNotes, setReleaseNotes] = useState("")
  const [sendSms, setSendSms] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      if (!versionName) {
        const name = e.target.files[0].name.replace('.apk', '').replace('app-release-', '')
        setVersionName(name)
      }
    }
  }

  const handleUpload = async () => {
    if (uploadMode === "file" && !file) return
    if (uploadMode === "url" && !externalUrl) return
    if (!versionName) return

    setUploading(true)
    setStatus("idle")
    setErrorMessage("")
    setProgress(0)

    try {
      let finalPath = ""

      if (uploadMode === "file" && file) {
        const fileName = `${Date.now()}_${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("app-releases")
          .upload(fileName, file, { cacheControl: "3600", upsert: false })

        if (uploadError) throw new Error(uploadError.message)
        finalPath = uploadData.path
      } else {
        // External URL mode
        if (!externalUrl.startsWith('http')) {
          throw new Error("External URL must start with http:// or https://")
        }
        finalPath = externalUrl
      }

      setProgress(100)

      const res = await registerAppVersion(versionName, finalPath, releaseNotes, sendSms)
      
      if (res.error) throw new Error(res.error)

      setStatus("success")
      setFile(null)
      setExternalUrl("")
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
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Publish New Release</h3>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setUploadMode("file")}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${uploadMode === "file" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Upload File
          </button>
          <button
            onClick={() => setUploadMode("url")}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${uploadMode === "url" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            External URL
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {uploadMode === "file" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">APK File</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative hover:bg-gray-50 transition-colors">
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" accept=".apk" className="sr-only" onChange={handleFileChange} disabled={uploading} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  {file ? file.name : "Android APK up to 50MB (Supabase Free Tier)"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direct Download Link</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="url" 
                value={externalUrl}
                onChange={e => setExternalUrl(e.target.value)}
                disabled={uploading}
                className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://drive.google.com/..."
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Use this for files larger than 50MB. Google Drive, Dropbox, or GitHub Releases.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Version Name</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Release Notes (Optional)</label>
          <textarea 
            value={releaseNotes}
            onChange={e => setReleaseNotes(e.target.value)}
            disabled={uploading}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="What's new in this version?"
          />
        </div>

        <div className="flex items-center">
          <input
            id="send-sms"
            type="checkbox"
            checked={sendSms}
            onChange={e => setSendSms(e.target.checked)}
            disabled={uploading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="send-sms" className="ml-2 block text-sm text-gray-900">
            Send SMS notification to all technicians
          </label>
        </div>

        {status === 'error' && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md flex items-start gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="p-3 bg-green-50 text-green-700 rounded-md flex items-start gap-2 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <p>App version registered successfully!</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={(uploadMode === "file" && !file) || (uploadMode === "url" && !externalUrl) || !versionName || uploading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? (
            <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Publishing...</>
          ) : "Publish Release"}
        </button>
      </div>
    </div>
  )
}
