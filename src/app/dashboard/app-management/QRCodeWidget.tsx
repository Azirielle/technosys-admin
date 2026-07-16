"use client"

import { QRCodeCanvas } from "qrcode.react"
import { useEffect, useState } from "react"
import { Smartphone, Download } from "lucide-react"

export default function QRCodeWidget() {
  const [downloadUrl, setDownloadUrl] = useState("")

  useEffect(() => {
    // Generate the URL dynamically based on where the app is hosted
    if (typeof window !== "undefined") {
      setDownloadUrl(`${window.location.origin}/technician`)
    }
  }, [])

  if (!downloadUrl) return null

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center flex flex-col items-center">
      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
        <Smartphone className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">Technician Portal QR Code</h3>
      <p className="text-sm text-gray-500 mb-6">
        Have your technicians scan this code to access the secure download page.
      </p>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 inline-block">
        <QRCodeCanvas 
          value={downloadUrl}
          size={200}
          bgColor={"#ffffff"}
          fgColor={"#000000"}
          level={"H"}
          includeMargin={false}
        />
      </div>
      
      <div className="mt-6 p-3 bg-gray-50 rounded-md text-sm text-gray-600 flex items-center justify-between w-full">
        <span className="truncate mr-2">{downloadUrl}</span>
        <button 
          onClick={() => navigator.clipboard.writeText(downloadUrl)}
          className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap shrink-0"
        >
          Copy Link
        </button>
      </div>
    </div>
  )
}
