'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { 
  ChevronLeft, 
  ChevronRight, 
  Pause, 
  Play, 
  Building2, 
  MapPin, 
  Wrench, 
  Cpu, 
  Layers
} from 'lucide-react'
import { technocyclePortfolio, PortfolioProject } from '@/lib/portfolio-data'

export function PortfolioShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const total = technocyclePortfolio.length
  const activeProject = technocyclePortfolio[currentIndex]

  const DURATION_MS = 6000
  const STEP_MS = 50

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total)
    setProgress(0)
  }, [total])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total)
    setProgress(0)
  }, [total])

  const handleSelect = (index: number) => {
    setCurrentIndex(index)
    setProgress(0)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === ' ') {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setIsPaused((prev) => !prev)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev])

  // Autoplay progression timer
  useEffect(() => {
    if (isPaused) return

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (STEP_MS / DURATION_MS) * 100
        if (next >= 100) {
          handleNext()
          return 0
        }
        return next
      })
    }, STEP_MS)

    return () => clearInterval(timer)
  }, [isPaused, handleNext])

  // Category badge styling
  const getCategoryColor = (category: PortfolioProject['category']) => {
    switch (category) {
      case 'Healthcare':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      case 'Industrial':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      case 'Automotive':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'Education':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/30'
      case 'Hospitality':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'Residential':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
      case 'Retail':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    }
  }

  return (
    <div 
      className="relative w-full h-[540px] lg:h-full min-h-[540px] lg:min-h-[100dvh] bg-zinc-950 text-white overflow-hidden flex flex-col justify-between p-6 sm:p-8 lg:p-12 select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Images Crossfade Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {technocyclePortfolio.map((project, idx) => {
          const isActive = idx === currentIndex
          return (
            <div
              key={project.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              } transition-transform duration-10000 ease-out`}
            >
              <Image
                src={project.image}
                alt={project.title}
                fill
                priority={idx === 0 || isActive}
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover object-center"
              />
            </div>
          )
        })}

        {/* Ambient Dark Gradient Scrims */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/40 via-transparent to-zinc-950/60 z-10" />
      </div>

      {/* TOP HEADER CONTROLS */}
      <div className="relative z-20 flex items-center justify-between gap-4">
        {/* Brand & Showcase Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 text-[11px] font-medium tracking-wider text-zinc-300 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            </span>
            <span>HVAC ENGINEERING PORTFOLIO</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            <span>{total} Verified Installations</span>
          </div>
        </div>

        {/* Playback & Manual Scrub Controls */}
        <div className="flex items-center gap-2">
          {/* Slide Counter */}
          <div className="px-3 py-1 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 text-xs font-mono text-zinc-300">
            <span className="text-white font-bold">
              {String(currentIndex + 1).padStart(2, '0')}
            </span>
            <span className="text-zinc-500 mx-1">/</span>
            <span className="text-zinc-400">{String(total).padStart(2, '0')}</span>
          </div>

          {/* Pause / Play Toggle */}
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            aria-label={isPaused ? 'Resume slideshow' : 'Pause slideshow'}
            className="w-8 h-8 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
          </button>

          {/* Previous Slide */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous project"
            className="w-8 h-8 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Next Slide */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next project"
            className="w-8 h-8 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOTTOM TELEMETRY HERO SECTION */}
      <div className="relative z-20 space-y-4 max-w-2xl">
        {/* Category & Tag Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase border ${getCategoryColor(activeProject.category)} backdrop-blur-md`}>
            {activeProject.category}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide bg-white/10 border border-white/15 text-zinc-200 backdrop-blur-md">
            {activeProject.tag}
          </span>
        </div>

        {/* Main Project Title & Client */}
        <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white drop-shadow-md">
            {activeProject.title}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-300">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{activeProject.client}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{activeProject.location}</span>
            </div>
          </div>
        </div>

        {/* Engineering Specifications Doppelrand Card */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/75 backdrop-blur-md p-3.5 sm:p-4 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>ENGINEERING SCOPE</span>
              </div>
              <p className="text-zinc-200 leading-relaxed pl-5 font-normal">
                {activeProject.scope}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>SYSTEM ARCHITECTURE</span>
              </div>
              <p className="text-zinc-200 leading-relaxed pl-5 font-normal">
                {activeProject.systemType}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Segmented Progress Bar & Thumbnails */}
        <div className="space-y-2 pt-1">
          {/* Continuous Progress Line for Active Slide */}
          <div className="w-full bg-white/15 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 h-full transition-all duration-75 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Segmented Interactive Indicators (Click to scrub) */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 no-scrollbar">
            {technocyclePortfolio.map((proj, idx) => {
              const isCurrent = idx === currentIndex
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  title={`${proj.title} (${proj.client})`}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    isCurrent 
                      ? 'w-6 sm:w-8 bg-white shadow-xs' 
                      : 'w-1.5 sm:w-2 bg-white/30 hover:bg-white/60'
                  }`}
                  aria-label={`Jump to slide ${idx + 1}: ${proj.title}`}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
