'use client'

import React from 'react'

export interface FormattedPolicyDocumentProps {
  content: string
  className?: string
  /** AI chat answers: keep "Status: …" lines (only policy documents carry a stale one to hide). */
  keepStatusLines?: boolean
}

export default function FormattedPolicyDocument({
  content,
  className = '',
  keepStatusLines = false,
}: FormattedPolicyDocumentProps) {
  if (!content) {
    return <p className="text-xs text-ink-3 italic">No document text available.</p>
  }

  // Parse inline markdown tokens: **bold**, *italic*, `code`
  const renderInline = (text: string) => {
    // Regex splits by bold, italic, and code segments
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="italic text-ink-2">
            {part.slice(1, -1)}
          </em>
        )
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-surface-soft text-micro font-mono text-ink font-semibold"
          >
            {part.slice(1, -1)}
          </code>
        )
      }
      return part
    })
  }

  // Filter out redundant static status lines that conflict with dynamic app metadata
  const lines = content
    .split('\n')
    .filter((line) => keepStatusLines || !/^\s*\*{0,2}status\*{0,2}\s*:\s*.+$/i.test(line.trim()))

  return (
    <div
      data-testid="formatted-policy-content"
      className={`space-y-2.5 text-xs text-ink leading-relaxed select-text ${className}`}
    >
      {lines.map((line, idx) => {
        const trimmed = line.trim()

        if (!trimmed) {
          return <div key={idx} className="h-1.5" />
        }

        // Horizontal divider: ---
        if (trimmed === '---') {
          return (
            <hr
              key={idx}
              className="my-4 border-line"
            />
          )
        }

        // H1 Heading: # Title
        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className="text-lg md:text-xl font-semibold text-ink tracking-tight pt-2 pb-1 border-b border-line"
            >
              {trimmed.slice(2)}
            </h1>
          )
        }

        // H2 Heading: ## Section
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-sm md:text-base font-semibold text-ink tracking-tight pt-3 pb-0.5 text-ink"
            >
              {trimmed.slice(3)}
            </h2>
          )
        }

        // H3 Heading: ### Sub-section
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="text-xs md:text-sm font-semibold text-ink pt-2"
            >
              {trimmed.slice(4)}
            </h3>
          )
        }

        // Blockquote: > text
        if (trimmed.startsWith('> ')) {
          return (
            <div
              key={idx}
              className="pl-3.5 py-1.5 my-2 border-l-2 border-ink bg-blue-500/5 text-ink-2 italic rounded-r-lg"
            >
              {renderInline(trimmed.slice(2))}
            </div>
          )
        }

        // Bullet list item: - text or * text
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-3 my-1">
              <span className="w-1.5 h-1.5 rounded-full bg-action mt-1.5 shrink-0" />
              <div className="flex-1 text-ink-2">
                {renderInline(trimmed.slice(2))}
              </div>
            </div>
          )
        }

        // Numbered list item: 1. text, 2. text
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 ml-2 my-1.5">
              <span className="font-mono font-semibold text-ink text-micro shrink-0 pt-0.5">
                {numberedMatch[1]}.
              </span>
              <div className="flex-1 text-ink-2">
                {renderInline(numberedMatch[2])}
              </div>
            </div>
          )
        }

        // Regular paragraph text
        return (
          <p key={idx} className="my-1 text-ink-2">
            {renderInline(trimmed)}
          </p>
        )
      })}
    </div>
  )
}
