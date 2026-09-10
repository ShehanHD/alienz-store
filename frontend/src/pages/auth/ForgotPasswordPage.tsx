// TODO: This is a stub page. Implement password reset flow (send reset email, handle token) when backend supports it.
import { Link } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import styles from './AuthLayout.module.css'

export function ForgotPasswordPage() {
  return (
    <AuthLayout brandSubtitle="Reset your password to get back into your account.">
      <div>
        <h1 className={styles.heading}>Password Reset</h1>
        <p className={styles.subheading}>Please contact the store to reset your password.</p>
      </div>
      <p className={styles.foot}>
        Remembered it? <Link to="/auth/login" className={styles.inlineLink}>Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
