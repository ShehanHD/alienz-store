import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface ConfirmOptions {
  title?: string
  confirmLabel?: string
  variant?: 'default' | 'danger'
}

interface ConfirmState {
  isOpen: boolean
  message: string
  options: ConfirmOptions
}

interface ConfirmContextValue {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>
  state: ConfirmState
  resolve: (value: boolean) => void
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

const CLOSED: ConfirmState = { isOpen: false, message: '', options: {} }

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>(CLOSED)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((message: string, options: ConfirmOptions = {}): Promise<boolean> => {
    setState({ isOpen: true, message, options })
    return new Promise<boolean>((res) => {
      resolveRef.current = res
    })
  }, [])

  const resolve = useCallback((value: boolean) => {
    resolveRef.current?.(value)
    resolveRef.current = null
    setState(CLOSED)
  }, [])

  return (
    <ConfirmContext.Provider value={{ confirm, state, resolve }}>
      {children}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}

export function useConfirmContext() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirmContext must be used within ConfirmProvider')
  return ctx
}
