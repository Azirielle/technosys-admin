// Keys: keyboard keys drawn as small caps, e.g. [G] [L] or [Ctrl] [K].
export function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((k) => (
        <kbd key={k} className="min-w-6 rounded-chip bg-surface-soft px-1.5 py-0.5 text-center font-mono text-micro text-ink-2">
          {k}
        </kbd>
      ))}
    </span>
  )
}
