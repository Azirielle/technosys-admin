'use client'

import { useState } from 'react'
import { ShieldCheck, Loader2, ScrollText, CheckCircle2 } from 'lucide-react'
import ModalDialog from '@/components/ui/ModalDialog'
import { getPublicPolicy, CompanyPolicy } from '@/app/actions/policies'

export function LoginPolicyModal({ variant = 'default' }: { variant?: 'default' | 'on-blue' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'executive_governance' | 'terms_of_service'>('executive_governance')
  const [policyData, setPolicyData] = useState<Record<string, CompanyPolicy>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleOpen = async (policyId: 'executive_governance' | 'terms_of_service' = activeTab) => {
    setIsOpen(true)
    if (policyData[policyId]) return

    setIsLoading(true)
    try {
      const res = await getPublicPolicy(policyId)
      if (res.success && res.policy) {
        setPolicyData(prev => ({ ...prev, [policyId]: res.policy! }))
      }
    } catch (err) {
      console.error('Failed to load administrative policy:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTabChange = async (tab: 'executive_governance' | 'terms_of_service') => {
    setActiveTab(tab)
    if (!policyData[tab]) {
      setIsLoading(true)
      try {
        const res = await getPublicPolicy(tab)
        if (res.success && res.policy) {
          setPolicyData(prev => ({ ...prev, [tab]: res.policy! }))
        }
      } catch (err) {
        console.error('Failed to load tab policy:', err)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const currentPolicy = policyData[activeTab]

  return (
    <>
      <p className={`text-xs ${variant === 'on-blue' ? 'text-blue-200/90' : 'text-zinc-500'}`}>
        By signing in, you agree to{' '}
        <button
          type="button"
          onClick={() => handleOpen('executive_governance')}
          className={`font-semibold hover:underline cursor-pointer transition-colors ${
            variant === 'on-blue'
              ? 'text-white hover:text-blue-100 underline decoration-blue-300'
              : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
          }`}
        >
          TechnoCycle administrative policies
        </button>
        .
      </p>

      <ModalDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="TechnoCycle Administrative Governance"
        subtitle="Official institutional policies and platform terms governing administrative access."
        maxWidth="2xl"
        iconVariant="default"
        icon={ShieldCheck}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-zinc-400 font-mono">
              TechnoCycle Corp. Compliance Dept.
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Close Charter
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Policy Segment Switcher (Pinned Header) */}
          <div className="sticky -top-5 z-10 bg-white dark:bg-zinc-900 pt-1 pb-2">
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => handleTabChange('executive_governance')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'executive_governance'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                <ScrollText className="w-3.5 h-3.5 text-zinc-500" />
                <span>Executive Governance</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('terms_of_service')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'terms_of_service'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                <span>Platform Terms</span>
              </button>
            </div>
          </div>

          {/* Policy Body */}
          {isLoading ? (
            <div className="h-56 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              <span className="text-xs font-medium">Loading official compliance policy...</span>
            </div>
          ) : currentPolicy ? (
            <div className="space-y-3.5 pr-1">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {currentPolicy.title}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Version {currentPolicy.version} • Effective: {currentPolicy.effective_date}
                  </p>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900">
                  {currentPolicy.category}
                </span>
              </div>

              {/* Executive Summary Callout */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Institutional Scope & Executive Summary
                </p>
                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {currentPolicy.summary}
                </p>
              </div>

              {/* Structured Policy Content */}
              <div className="pt-1">
                {renderFormattedContent(currentPolicy.content_markdown)}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-zinc-400">
              Failed to retrieve policy document. Please contact the Compliance Officer.
            </div>
          )}
        </div>
      </ModalDialog>
    </>
  )
}

function renderFormattedContent(markdown: string) {
  if (!markdown) return null

  const lines = markdown.split('\n')
  const sections: {
    title?: string
    body: Array<{ type: 'paragraph' | 'numbered' | 'bullet'; text: string; num?: string }>
  }[] = []

  let currentSection: (typeof sections)[0] = { body: [] }
  const docMetadata: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    if (!trimmed || trimmed === '---') continue

    // Skip top level title since modal header already displays it
    if (trimmed.startsWith('# ')) {
      continue
    }

    // Capture top metadata lines before sections begin
    if (
      !currentSection.title &&
      (trimmed.startsWith('**Effective Date:**') ||
        trimmed.startsWith('**Statutory Authority:**') ||
        trimmed.startsWith('**Applicability:**') ||
        trimmed.startsWith('**Governing Entity:**'))
    ) {
      docMetadata.push(trimmed)
      continue
    }

    // Heading 3: ### 1. Section Title
    if (trimmed.startsWith('### ')) {
      if (currentSection.title || currentSection.body.length > 0) {
        sections.push(currentSection)
      }
      currentSection = {
        title: trimmed.replace(/^###\s+/, ''),
        body: []
      }
      continue
    }

    // Numbered list items: e.g. "1. **Title:** text" or "1. text"
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
    if (numberedMatch) {
      currentSection.body.push({
        type: 'numbered',
        num: numberedMatch[1],
        text: numberedMatch[2]
      })
      continue
    }

    // Bullet list items: e.g. "- text" or "* text"
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/)
    if (bulletMatch) {
      currentSection.body.push({
        type: 'bullet',
        text: bulletMatch[1]
      })
      continue
    }

    // Normal paragraph
    currentSection.body.push({
      type: 'paragraph',
      text: trimmed
    })
  }

  if (currentSection.title || currentSection.body.length > 0) {
    sections.push(currentSection)
  }

  return (
    <div className="space-y-3.5">
      {/* Top Document Metadata Pills */}
      {docMetadata.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2.5 bg-zinc-100/70 dark:bg-zinc-800/50 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 text-[11px] text-zinc-600 dark:text-zinc-400">
          {docMetadata.map((meta, mIdx) => (
            <div key={mIdx} className="flex items-center gap-1">
              {renderFormattedInline(meta)}
            </div>
          ))}
        </div>
      )}

      {/* Structured Sections */}
      {sections.map((sec, sIdx) => (
        <div
          key={sIdx}
          className="p-3.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/90 bg-white/60 dark:bg-zinc-900/40 space-y-2.5 shadow-2xs"
        >
          {sec.title && (
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/70 pb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              {sec.title}
            </h4>
          )}

          <div className="space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {sec.body.map((item, bIdx) => {
              if (item.type === 'numbered') {
                return (
                  <div key={bIdx} className="flex items-start gap-2.5 pl-0.5">
                    <span className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold mt-0.5 border border-blue-200 dark:border-blue-900">
                      {item.num}
                    </span>
                    <div className="flex-1">
                      {renderFormattedInline(item.text)}
                    </div>
                  </div>
                )
              }
              if (item.type === 'bullet') {
                return (
                  <div key={bIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-blue-500 font-bold leading-tight mt-0.5">•</span>
                    <div className="flex-1">
                      {renderFormattedInline(item.text)}
                    </div>
                  </div>
                )
              }
              return (
                <p key={bIdx}>
                  {renderFormattedInline(item.text)}
                </p>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function renderFormattedInline(text: string) {
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g)
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      const content = token.slice(2, -2)
      return (
        <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {content}
        </strong>
      )
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      const content = token.slice(1, -1)
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-mono text-blue-600 dark:text-blue-400 border border-zinc-200/60 dark:border-zinc-700/60"
        >
          {content}
        </code>
      )
    }
    return token
  })
}
