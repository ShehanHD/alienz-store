import styles from './PageLoader.module.css'

export function PageLoader() {
  return (
    <div className={styles.overlay} role="status" aria-label="Loading">
      <div className={styles.spinner} />
    </div>
  )
}
