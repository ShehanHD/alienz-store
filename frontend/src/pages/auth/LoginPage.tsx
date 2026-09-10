import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Stack, Checkbox } from '@shehandon/vcs-ui'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { AuthLayout } from './AuthLayout'
import styles from './AuthLayout.module.css'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/account')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Stack as="form" direction="column" gap="5" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <h1 className={styles.heading}>Sign In</h1>
          <p className={styles.subheading}>Welcome back — please enter your details.</p>
        </div>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type="password"
          revealable
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <Stack direction="row" align="center" justify="between" wrap gap="3">
          <Checkbox
            label="Remember me"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <Link to="/auth/forgot-password" className={styles.inlineLink}>Forgot password?</Link>
        </Stack>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <Button type="submit" loading={loading}>Sign In</Button>

        <p className={styles.foot}>
          Don&apos;t have an account? <Link to="/auth/register" className={styles.inlineLink}>Create one</Link>
        </p>
      </Stack>
    </AuthLayout>
  )
}
