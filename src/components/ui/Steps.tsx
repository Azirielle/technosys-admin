// Steps: numbered progress for a form in several parts (1 Job, 2 Time, 3 Team, 4 Review). Click a step to go to it.
// `done` ticks parts filled in any order (one long form); without it, steps before `current` count as done.
'use client'

import { Check } from 'lucide-react'
import { cx } from './cx'

export function Steps({ steps, current, done: doneList, onSelect }: { steps: string[]; current: number; done?: boolean[]; onSelect?: (step: number) => void }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((label, i) => {
        const n = i + 1
        const done = doneList ? doneList[i] : n < current
        const here = n === current
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect?.(n)}
              aria-current={here ? 'step' : undefined}
              className="flex cursor-pointer items-center gap-2 rounded-pill focus-visible:outline-2 focus-visible:outline-focus"
            >
              <span
                className={cx(
                  'flex size-6 shrink-0 items-center justify-center rounded-pill text-micro font-semibold',
                  here ? 'bg-action text-on-action' : done ? 'bg-success-soft text-success' : 'bg-surface-soft text-ink-3',
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : n}
              </span>
              <span className={cx('hidden text-caption font-medium whitespace-nowrap sm:inline', here ? 'text-ink' : 'text-ink-3')}>{label}</span>
            </button>
            {n < steps.length && <span className="h-px flex-1 bg-line" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}
