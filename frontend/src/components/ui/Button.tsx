import styles from './Button.module.css'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly loading?: boolean
  readonly variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ loading = false, variant = 'primary', disabled, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${styles.btn} ${styles[variant]}`}
    >
      {loading && <span className={styles.spinnerIcon} aria-hidden="true" />}
      <span className={loading ? styles.srOnly : undefined}>{children}</span>
    </button>
  )
}
