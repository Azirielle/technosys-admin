'use client'

import { useState, useEffect } from 'react'

const PROJECTS = [
  {
    image: '/portfolio/premier-medical.png',
    label: 'The Premiere Medical Center // Commercial HVAC Chiller Plant'
  },
  {
    image: '/portfolio/pasig-doctors.png',
    label: 'Pasig Doctors Medical Center // Split-Type Chiller System'
  },
  {
    image: '/portfolio/dlsu-henry-sy.png',
    label: 'DLSU Henry Sy Sr. Hall // Industrial Mechanical Infrastructure'
  },
  {
    image: '/portfolio/smdc-residences.png',
    label: 'SMDC Residences // High-Rise Ventilation & Cooling'
  }
]

export function LoginBackgroundCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % PROJECTS.length)
    }, 7500)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      {/* Background Stage */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {PROJECTS.map((proj, idx) => (
          <div
            key={proj.image}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-[1800ms] ease-in-out ${
              idx === currentSlide
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-105'
            }`}
            style={{
              backgroundImage: `url('${proj.image}')`,
              transitionProperty: 'opacity, transform',
              transitionDuration: '1800ms, 8500ms'
            }}
          />
        ))}

        {/* Lighter, clear architectural overlay vignette */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-[#060C18]/35 via-[#040912]/50 to-[#040810]/70 backdrop-blur-[1.5px]" 
          aria-hidden="true"
        />
      </div>

      {/* Facility Project Location Badge */}
      <div className="hidden sm:inline-flex fixed bottom-5 left-6 z-10 items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#060C18]/80 border border-white/10 backdrop-blur-md shadow-lg shadow-black/40 text-xs text-slate-300 pointer-events-none select-none transition-all duration-500">
        <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
        <span className="font-mono text-[11px] tracking-wide">
          {PROJECTS[currentSlide].label}
        </span>
      </div>
    </>
  )
}
