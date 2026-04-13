import styles from './Input.module.css'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  readonly label: string
  readonly error?: string
}

export function Input({ label, error, id, ...rest }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>{label}</label>
      <input id={inputId} {...rest} className={`${styles.input} ${error ? styles.hasError : ''}`} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
