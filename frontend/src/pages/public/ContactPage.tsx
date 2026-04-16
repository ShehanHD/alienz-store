import { useState } from 'react'
import { submitEnquiry } from '../../api/enquiries'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import styles from './ContactPage.module.css'

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await submitEnquiry({ name, email, phone: '', message })
      setSent(true)
    } catch {
      setError('Failed to send. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) return <div className={styles.page}><p className={styles.success}>Thanks! We&apos;ll be in touch.</p></div>

  return (
    <div className={styles.page}>
      <h1>Contact</h1>
      <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className={styles.field}>
          <label htmlFor="message">Message</label>
          <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit" loading={loading}>Send Message</Button>
      </form>
    </div>
  )
}
