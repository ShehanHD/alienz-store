import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import styles from './RegisterPage.module.css'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(email, password, firstName, lastName)
      navigate('/account')
    } catch {
      setError('Registration failed. Email may already be in use.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
      <h1>Create Account</h1>
      <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className={styles.error}>{error}</p>}
      <Button type="submit" loading={loading}>Register</Button>
      <p>Already have an account? <Link to="/auth/login">Login</Link></p>
    </form>
  )
}
