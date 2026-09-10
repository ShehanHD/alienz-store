import { useState } from 'react'
import { Textarea, Container, Stack } from '@shehandon/vcs-ui'
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

  if (sent) return (
    <Container size="sm" padding="6">
      <p className={styles.success}>Thanks! We&apos;ll be in touch.</p>
    </Container>
  )

  return (
    <Container size="sm" padding="6">
      <h1 className={styles.title}>Contact</h1>
      <Stack as="form" direction="column" gap="6" onSubmit={(e) => void handleSubmit(e)}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Textarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} />
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit" loading={loading}>Send Message</Button>
      </Stack>
    </Container>
  )
}
