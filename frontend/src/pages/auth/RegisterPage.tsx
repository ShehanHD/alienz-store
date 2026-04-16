import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import styles from './RegisterPage.module.css'

export function RegisterPage() {
  const { register } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(email, password, firstName, lastName, phone)
      setSubmitted(true)
    } catch {
      setError('Registration failed. Email may already be in use.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.form}>
          <h1 className={styles.heading}>Check your email</h1>
          <p>We've sent a confirmation link to <strong>{email}</strong>.</p>
          <p>Click the link in the email to activate your account.</p>
          <p className={styles.links}>
            Didn't receive it?{' '}
            <Link to={`/auth/confirm-email?resend=1&email=${encodeURIComponent(email)}`}>
              Resend confirmation
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
        <h1 className={styles.heading}>Create Account</h1>
        <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
        {error && <p className={styles.error} role="alert">{error}</p>}
        <Button type="submit" loading={loading}>Create Account</Button>
        <p className={styles.links}>Already have an account? <Link to="/auth/login">Sign in</Link></p>
      </form>
    </div>
  )
}
