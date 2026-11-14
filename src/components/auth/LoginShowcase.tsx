// LoginShowcase: the photo panel beside the login form — Technocycle's real projects, fading one to the next.
'use client'

import { useEffect, useState } from 'react'
import { cx } from '@/components/ui'

const PROJECTS = [
  { image: '/portfolio/premier-medical.png', name: 'The Premiere Medical Center', work: 'Commercial chiller plant' },
  { image: '/portfolio/pasig-doctors.png', name: 'Pasig Doctors Medical Center', work: 'Split-type chiller system' },
  { image: '/portfolio/dlsu-henry-sy.png', name: 'DLSU Henry Sy Sr. Hall', work: 'Mechanical systems' },
  { image: '/portfolio/smdc-residences.png', name: 'SMDC Residences', work: 'High-rise ventilation and cooling' },
]

const SLIDE_MS = 7000

export function LoginShowcase() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setCurrent((i) => (i + 1) % PROJECTS.length), SLIDE_MS)
    return () => clearInterval(timer)
  }, [])

  const project = PROJECTS[current]
  return (
    <div className="relative h-full overflow-hidden rounded-modal bg-surface-soft" aria-hidden="true">
      {PROJECTS.map((p, i) => (
        <div
          key={p.image}
          className={cx('absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms]', i === current ? 'opacity-100' : 'opacity-0')}
          style={{ backgroundImage: `url('${p.image}')` }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute right-6 bottom-6 left-6 flex items-end justify-between gap-4">
        <div className="text-white">
          <p className="text-caption opacity-80">{project.work}</p>
          <p className="text-heading font-semibold">{project.name}</p>
        </div>
        <div className="flex gap-1.5">
          {PROJECTS.map((p, i) => (
            <span key={p.image} className={cx('h-1.5 rounded-pill bg-white transition-all', i === current ? 'w-5' : 'w-1.5 opacity-50')} />
          ))}
        </div>
      </div>
    </div>
  )
}
