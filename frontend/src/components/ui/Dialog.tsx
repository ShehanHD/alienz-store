import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import styles from './Dialog.module.css'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Dialog({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      el.showModal()
    } else {
      el.close()
    }
  }, [open])

  // Sync native close event (ESC key) back to parent
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = () => onClose()
    el.addEventListener('close', handler)
    return () => el.removeEventListener('close', handler)
  }, [onClose])

  // Click on backdrop closes
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <dialog ref={ref} className={styles.dialog} onClick={handleBackdropClick}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </dialog>
  )
}
