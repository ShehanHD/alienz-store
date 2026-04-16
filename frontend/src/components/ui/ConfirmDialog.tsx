import { useEffect, useRef } from 'react'
import { useConfirmContext } from '../../contexts/ConfirmContext'
import styles from './ConfirmDialog.module.css'

export function ConfirmDialog() {
  const { state, resolve } = useConfirmContext()
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (state.isOpen) confirmBtnRef.current?.focus()
  }, [state.isOpen])

  useEffect(() => {
    if (!state.isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') resolve(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.isOpen, resolve])

  if (!state.isOpen) return null

  const { message, options } = state
  const confirmLabel = options.confirmLabel ?? 'Confirm'
  const variant = options.variant ?? 'default'

  return (
    <div className={styles.overlay} onClick={() => resolve(false)}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={options.title ? 'confirm-title' : undefined}
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        {options.title && (
          <p id="confirm-title" className={styles.title}>{options.title}</p>
        )}
        <p id="confirm-message" className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => resolve(false)}>
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`${styles.confirmBtn} ${variant === 'danger' ? styles.danger : ''}`}
            onClick={() => resolve(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
