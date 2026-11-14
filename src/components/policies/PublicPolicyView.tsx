'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Printer, ShieldCheck, Calendar, FileText, CheckCircle2 } from 'lucide-react'
import { CompanyPolicy } from '@/app/actions/policies'

export default function PublicPolicyView({ policy }: { policy: CompanyPolicy }) {
  const handlePrint = () => {
    window.print()
  }

  // Format simple markdown into styled React elements
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n')
    return lines.map((line, idx) => {
      const trimmed = line.trim()

      if (!trimmed) {
        return <div key={idx} className="h-3" />
      }

      if (trimmed === '---') {
        return <hr key={idx} className="my-6 border-line" />
      }

      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-2xl font-semibold text-ink tracking-tight mt-6 mb-3">
            {trimmed.slice(2)}
          </h1>
        )
      }

      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-xl font-semibold text-ink tracking-tight mt-5 mb-2.5">
            {trimmed.slice(3)}
          </h2>
        )
      }

      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-base font-semibold text-ink tracking-tight mt-4 mb-2">
            {trimmed.slice(4)}
          </h3>
        )
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemText = trimmed.slice(2)
        return (
          <li key={idx} className="ml-5 list-disc text-sm text-ink-2 leading-relaxed my-1">
            <span dangerouslySetInnerHTML={{ __html: formatInline(itemText) }} />
          </li>
        )
      }

      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
      if (numberedMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 text-sm text-ink-2 leading-relaxed my-1.5 ml-2">
            <span className="font-semibold text-ink shrink-0">{numberedMatch[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: formatInline(numberedMatch[2]) }} />
          </div>
        )
      }

      return (
        <p key={idx} className="text-sm text-ink-2 leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
      )
    })
  }

  const formatInline = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface-soft text-xs font-mono text-ink ">$1</code>')
  }

  return (
    <div className="min-h-screen bg-surface-soft text-ink transition-colors py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Toolbar */}
        <div className="flex items-center justify-between pb-6 border-b border-line print:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-ink-2 hover:text-ink transition-colors "
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portal
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-2 hover:bg-surface-soft transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Header Document Lockup */}
        <div className="mt-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-action flex items-center justify-center text-on-action shadow-2xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-micro font-semibold text-ink ">
                TechnoCycle Corporation Compliance
              </span>
              <p className="text-xs text-ink-2 font-medium">
                Pacita Complex, San Pedro, Laguna, Philippines
              </p>
            </div>
          </div>

          <h1 className="text-3xl font-semibold text-ink tracking-tight">
            {policy.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2.5 mt-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-info-soft text-ink border border-transparent">
              {policy.version}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-soft text-ink-2 border border-line ">
              {policy.category}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-ink-2 font-medium ml-1">
              <Calendar className="w-3.5 h-3.5" />
              Effective: {new Date(policy.effective_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* 5-Second Executive Summary Card */}
        <div className="rounded-card p-4 sm:p-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/20 border border-transparent mb-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-ink shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xs font-semibold text-ink mb-1">
                5-Second Plain Language Summary
              </h2>
              <p className="text-xs text-blue-900/90 leading-relaxed font-medium">
                {policy.summary}
              </p>
            </div>
          </div>
        </div>

        {/* Main Prose Content */}
        <div className="bg-surface border border-line rounded-3xl p-6 sm:p-10 shadow-2xs">
          {renderMarkdown(policy.content_markdown)}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-ink-3 pb-12">
          © {new Date().getFullYear()} TechnoCycle Corporation. All official rights reserved. Operating under DOLE and NPC regulatory frameworks.
        </div>
      </div>
    </div>
  )
}
