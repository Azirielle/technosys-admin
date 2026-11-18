// TechyAvatar: Techy, the app's mascot and AI assistant (an aircon unit with a wrench), as a small still picture
// beside its messages in a ticket conversation. Same drawing as the phone app (Mobile-side src/ui/Techy.tsx).
export function TechyAvatar({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 110) / 120} viewBox="0 0 120 110" role="img" aria-label="Techy" className="shrink-0">
      <rect x="14" y="18" width="92" height="50" rx="18" fill="var(--color-surface)" stroke="var(--color-action)" strokeWidth="4" />
      <ellipse cx="44" cy="37" rx="5.5" ry="6" fill="var(--color-ink)" />
      <ellipse cx="76" cy="37" rx="5.5" ry="6" fill="var(--color-ink)" />
      <path d="M51 45 q9 8 18 0" stroke="var(--color-ink)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="46" r="5" fill="var(--color-danger-soft)" />
      <circle cx="86" cy="46" r="5" fill="var(--color-danger-soft)" />
      <path d="M104 40 l11 -12" stroke="var(--color-action)" strokeWidth="4" strokeLinecap="round" />
      <path d="M111 20 l8 4 -3 7 -8 -3z" fill="var(--color-action)" />
      <path d="M34 74 q-3 8 1 14 M60 74 v15 M86 74 q3 8 -1 14" stroke="var(--color-action)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeDasharray="4 6" opacity="0.6" />
    </svg>
  )
}
