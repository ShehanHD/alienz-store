import { X } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import styles from './Toast.module.css'

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className={styles.container} aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`} role="alert">
          <span className={styles.message}>{t.message}</span>
          <button
            type="button"
            className={styles.close}
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  )
}
