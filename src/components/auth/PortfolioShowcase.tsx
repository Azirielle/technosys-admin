'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { 
  ChevronLeft, 
  ChevronRight, 
  Pause, 
  Play, 
  Building2, 
  MapPin
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
        }
        return next % 100
      })
    }, STEP_MS)

    return () => clearInterval(timer)
  }, [isPaused, handleNext])

  // Category badge styling
  const getCategoryColor = (category: PortfolioProject['category']) => {
    switch (category) {
      case 'Healthcare':
        return 'bg-emerald-500/80 text-white border-emerald-400/40'
      case 'Industrial':
        return 'bg-amber-500/80 text-white border-amber-400/40'
      case 'Automotive':
        return 'bg-blue-500/80 text-white border-blue-400/40'
      case 'Education':
        return 'bg-teal-500/80 text-white border-teal-400/40'
      case 'Hospitality':
        return 'bg-purple-500/80 text-white border-purple-400/40'
      case 'Residential':
        return 'bg-cyan-600/80 text-white border-cyan-400/40'
      case 'Retail':
        return 'bg-orange-500/80 text-white border-orange-400/40'
      default:
        return 'bg-blue-600/80 text-white border-blue-400/40'
    }
  }

  return (
    <div 
      className="relative w-full h-[500px] lg:h-full min-h-[500px] lg:min-h-[100dvh] bg-zinc-900 text-white overflow-hidden flex flex-col justify-between p-6 sm:p-8 lg:p-12 select-none group"
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
                unoptimized
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover object-center"
              />
            </div>
          )
        })}

        {/* Ambient Subtle Vignette - only at bottom for text legibility, keeping buildings bright & natural */}
        <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10 pointer-events-none" />
      </div>

      {/* TOP HEADER CONTROLS */}
      <div className="relative z-20 flex items-center justify-end w-full gap-2">
        {/* Slide Counter */}
        <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-xs font-mono text-zinc-200 shadow-2xs">
          <span className="text-white font-bold">
            {String(currentIndex + 1).padStart(2, '0')}
          </span>
          <span className="text-zinc-400 mx-1">/</span>
          <span className="text-zinc-300">{String(total).padStart(2, '0')}</span>
        </div>

        {/* Pause / Play Toggle */}
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          aria-label={isPaused ? 'Resume slideshow' : 'Pause slideshow'}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-zinc-200 hover:text-white hover:bg-black/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
        >
          {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
        </button>

        {/* Previous Slide */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous project"
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-zinc-200 hover:text-white hover:bg-black/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Next Slide */}
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next project"
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-zinc-200 hover:text-white hover:bg-black/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* BOTTOM PROJECT HERO SECTION */}
      <div className="relative z-20 space-y-3 max-w-2xl">
        {/* Category & Tag Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase border ${getCategoryColor(activeProject.category)} backdrop-blur-md shadow-xs`}>
            {activeProject.category}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide bg-black/40 border border-white/20 text-zinc-100 backdrop-blur-md shadow-xs">
            {activeProject.tag}
          </span>
        </div>

        {/* Main Project Title & Client */}
        <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white drop-shadow-md">
            {activeProject.title}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-200">
            <div className="flex items-center gap-1.5 font-medium text-white drop-shadow-xs">
              <Building2 className="w-4 h-4 text-blue-300 shrink-0" />
              <span>{activeProject.client}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300 drop-shadow-xs">
              <MapPin className="w-4 h-4 text-rose-300 shrink-0" />
              <span>{activeProject.location}</span>
            </div>
          </div>
        </div>

        {/* Interactive Segmented Progress Bar & Thumbnails */}
        <div className="space-y-2 pt-1">
          {/* Continuous Progress Line for Active Slide */}
          <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 h-full transition-all duration-75 ease-linear rounded-full"
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
                      ? 'w-6 sm:w-8 bg-white shadow-sm' 
                      : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/75'
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
