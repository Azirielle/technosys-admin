// pageCommands: lets Quick actions and keyboard shortcuts tell a page "start a new one" or "open record X".
// If you're on that page already it happens at once; otherwise the page opens and does it when it loads.
'use client'

import { useEffect, useRef } from 'react'

export type PageCommand = 'new' | 'open' | 'lend'
export type CommandDetail = { path: string; command: PageCommand; id?: string; date?: string }

const EVENT = 'admin-page-command'

type Router = { push: (href: string) => void }

/** Runs a command on a page: right away if it's the current page, or by opening it with ?do=… in the link. */
export function runPageCommand(router: Router, currentPath: string, detail: CommandDetail) {
  if (currentPath === detail.path) {
    window.dispatchEvent(new CustomEvent<CommandDetail>(EVENT, { detail }))
    return
  }
  const params = new URLSearchParams({ do: detail.command })
  if (detail.id) params.set('id', detail.id)
  if (detail.date) params.set('date', detail.date)
  router.push(`${detail.path}?${params.toString()}`)
}

/**
 * A page lists the commands it understands. Commands arrive as an event (already on the page) or as
 * ?do=…&id=… in the link (just opened); the link part is removed afterwards so a refresh doesn't repeat it.
 */
export function usePageCommand(
  supported: PageCommand[],
  handler: (command: PageCommand, id?: string, date?: string) => void,
) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })
  const supportedKey = supported.join(',')

  useEffect(() => {
    const allowed = supportedKey.split(',') as PageCommand[]
    const params = new URLSearchParams(window.location.search)
    const fromLink = params.get('do') as PageCommand | null
    if (fromLink && allowed.includes(fromLink)) {
      handlerRef.current(fromLink, params.get('id') ?? undefined, params.get('date') ?? undefined)
      window.history.replaceState(null, '', window.location.pathname)
    }

    const onCommand = (e: Event) => {
      const { path, command, id, date } = (e as CustomEvent<CommandDetail>).detail
      if (path === window.location.pathname && allowed.includes(command)) handlerRef.current(command, id, date)
    }
    window.addEventListener(EVENT, onCommand)
    return () => window.removeEventListener(EVENT, onCommand)
  }, [supportedKey])
}
