"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"

export default function LoginClientWrapper({ 
  children, 
  isTechnicianPortal 
}: { 
  children: ReactNode, 
  isTechnicianPortal: boolean 
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4 overflow-hidden relative selection:bg-emerald-500 selection:text-white">
      {/* Animated Background Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          x: [0, -40, 0],
          y: [0, -50, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"
      />

      <div className="relative z-10 w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 text-center flex flex-col items-center"
        >
          {/* Logo container */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mb-6 bg-white/60 backdrop-blur-xl p-5 rounded-3xl shadow-sm border border-white/50 flex items-center justify-center"
          >
            <img src="/logo.png" alt="Technocycle" className="h-16 w-auto object-contain drop-shadow-sm" />
          </motion.div>
          
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-1.5 mb-2">
            <span className="text-emerald-600 bg-clip-text">TechnoSys</span> 
            <span className="font-medium text-slate-400">Hub</span>
          </h1>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            {isTechnicianPortal ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                App Download Portal
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                Unified Employee Access
              </span>
            )}
          </motion.div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
