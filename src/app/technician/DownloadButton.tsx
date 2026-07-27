"use client"

import { useState } from "react"
import { getSignedDownloadUrl } from "@/app/actions/app-distribution"
import { Download, Loader2, AlertCircle } from "lucide-react"

export default function DownloadButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDownload = async () => {
    setLoading(true)
    setError("")
    
    try {
      const res = await getSignedDownloadUrl()
      
      if (res.error) {
        throw new Error(res.error)
      }
      
      if (res.url) {
        // Trigger download
        const a = document.createElement("a")
        a.href = res.url
        // Optional: you can force download by setting a.download = "technocycle-app.apk"
        // but since the url is from Supabase Storage with download params, it should just work.
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err: any) {
      setError(err.message || "Failed to download app.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-white font-bold text-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Download className="w-6 h-6" />
        )}
        {loading ? "Preparing Download..." : "Download App"}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm w-full">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}
