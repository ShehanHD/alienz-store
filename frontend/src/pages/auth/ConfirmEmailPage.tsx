import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Stack } from '@shehandon/vcs-ui'
import { confirmEmail, resendConfirmation } from '../../api/auth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { AuthLayout } from './AuthLayout'
import styles from './AuthLayout.module.css'

type State = 'loading' | 'success' | 'expired' | 'invalid'

const BRAND_SUBTITLE = 'Confirm your email to activate your account.'

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
      <AuthLayout brandSubtitle={BRAND_SUBTITLE}>
        <p className={styles.subheading}>Confirming your email…</p>
      </AuthLayout>
    )
  }

  if (state === 'success') {
    return (
      <AuthLayout brandSubtitle={BRAND_SUBTITLE}>
        <div>
          <h1 className={styles.heading}>Email confirmed</h1>
          <p className={styles.subheading}>Your account is now active.</p>
        </div>
        <p className={styles.foot}>
          <Link to="/auth/login" className={styles.inlineLink}>Sign in →</Link>
        </p>
      </AuthLayout>
    )
  }

  if (state === 'expired') {
    return (
      <AuthLayout brandSubtitle={BRAND_SUBTITLE}>
        <div>
          <h1 className={styles.heading}>Link has expired</h1>
          <p className={styles.subheading}>Your confirmation link is no longer valid. Enter your email to get a new one.</p>
        </div>
        {resendSent ? (
          <p className={styles.subheading}>New link sent — check your inbox.</p>
        ) : (
          <Stack as="form" direction="column" gap="4" onSubmit={(e) => void handleResend(e)}>
            <Input
              label="Email"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              required
            />
            {resendError && <p className={styles.error} role="alert">{resendError}</p>}
            <Button type="submit" loading={resendLoading}>Resend</Button>
          </Stack>
        )}
      </AuthLayout>
    )
  }

  // invalid
  return (
    <AuthLayout brandSubtitle={BRAND_SUBTITLE}>
      <div>
        <h1 className={styles.heading}>Invalid link</h1>
        <p className={styles.subheading}>This confirmation link is invalid or has already been used.</p>
      </div>
      <p className={styles.foot}>
        <Link to="/auth/login" className={styles.inlineLink}>Go to sign in</Link>
      </p>
    </AuthLayout>
  )
}
