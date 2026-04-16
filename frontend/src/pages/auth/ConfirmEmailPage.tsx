import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmEmail, resendConfirmation } from '../../api/auth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import styles from './RegisterPage.module.css'

type State = 'loading' | 'success' | 'expired' | 'invalid'

export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [state, setState] = useState<State>('loading')
  const [resendEmail, setResendEmail] = useState(searchParams.get('email') ?? '')
  const [resendSent, setResendSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    if (!token) {
      setState('invalid')
      return
    }
    confirmEmail(token)
      .then(() => setState('success'))
      .catch((err: unknown) => {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined
        setState(status === 410 ? 'expired' : 'invalid')
      })
  }, [token])

  const handleResend = async (e: FormEvent) => {
    e.preventDefault()
    setResendError('')
    setResendLoading(true)
    try {
      await resendConfirmation(resendEmail)
      setResendSent(true)
    } catch {
      setResendError('Failed to send. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className={styles.wrapper}>
        <div className={styles.form}>
          <p>Confirming your email…</p>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className={styles.wrapper}>
        <div className={styles.form}>
          <h1 className={styles.heading}>Email confirmed!</h1>
          <p>Your account is now active.</p>
          <Link to="/auth/login">Sign in →</Link>
        </div>
      </div>
    )
  }

  if (state === 'expired') {
    return (
      <div className={styles.wrapper}>
        <div className={styles.form}>
          <h1 className={styles.heading}>Link has expired</h1>
          <p>Your confirmation link is no longer valid. Enter your email to get a new one.</p>
          {resendSent ? (
            <p>New link sent — check your inbox.</p>
          ) : (
            <form onSubmit={(e) => void handleResend(e)}>
              <Input
                label="Email"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
              />
              {resendError && <p role="alert">{resendError}</p>}
              <Button type="submit" loading={resendLoading}>Resend</Button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // invalid
  return (
    <div className={styles.wrapper}>
      <div className={styles.form}>
        <h1 className={styles.heading}>Invalid link</h1>
        <p>This confirmation link is invalid or has already been used.</p>
        <Link to="/auth/login">Go to sign in</Link>
      </div>
    </div>
  )
}
