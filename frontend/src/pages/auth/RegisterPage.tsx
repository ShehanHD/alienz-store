import { isAxiosError } from 'axios'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Stack } from '@shehandon/vcs-ui'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { AuthLayout } from './AuthLayout'
import styles from './AuthLayout.module.css'

export function RegisterPage() {
  const { register } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await register(email, password, firstName, lastName, phone)
      setSubmitted(true)
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setError(String(err.response.data.detail))
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <AuthLayout brandSubtitle="Create an account to save your favourites and track enquiries.">
        <div>
          <h1 className={styles.heading}>Check your email</h1>
          <p className={styles.subheading}>
            We&apos;ve sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
        </div>
        <p className={styles.foot}>
          Didn&apos;t receive it?{' '}
          <Link to={`/auth/confirm-email?resend=1&email=${encodeURIComponent(email)}`} className={styles.inlineLink}>
            Resend confirmation
          </Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout brandSubtitle="Create an account to save your favourites and track enquiries.">
      <Stack as="form" direction="column" gap="5" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <h1 className={styles.heading}>Create Account</h1>
          <p className={styles.subheading}>Join Alienz — it only takes a minute.</p>
        </div>

        <Stack direction={{ base: 'column', sm: 'row' }} gap="4">
          <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </Stack>

        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />

        <Input
          label="Password"
          type="password"
          revealable
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <Input
          label="Repeat Password"
          type="password"
          revealable
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          error={confirmPassword !== '' && confirmPassword !== password ? 'Passwords do not match.' : undefined}
        />

        {error && <p className={styles.error} role="alert">{error}</p>}

        <Button type="submit" loading={loading}>Create Account</Button>

        <p className={styles.foot}>
          Already have an account? <Link to="/auth/login" className={styles.inlineLink}>Sign in</Link>
        </p>
      </Stack>
    </AuthLayout>
  )
}
