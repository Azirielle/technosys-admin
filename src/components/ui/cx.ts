// cx(): joins class names and lets a later Tailwind class win over an earlier one.
import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge our token font sizes so "text-small" isn't mistaken for a colour.
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'title', 'heading', 'body', 'small', 'caption', 'micro'] }],
    },
  },
})

export function cx(...classes: ClassValue[]) {
  return merge(clsx(classes))
}
