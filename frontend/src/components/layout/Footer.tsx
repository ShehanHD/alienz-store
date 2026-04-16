import { useState } from 'react'
import { Link } from 'react-router-dom'
import { submitEnquiry } from '../../api/enquiries'
import styles from './Footer.module.css'

const PHONE = '+39 389 143 8813'
const EMAIL = 'info@alienz.store'
const INSTAGRAM_URL = 'https://www.instagram.com/the_alienz1?igsh=dHdtNHdldGQ2d2V1'
const TIKTOK_URL = 'https://www.tiktok.com/@the.alienz00?_r=1&_t=ZN-95ZHbGGzWuk'

function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <circle cx="17.5" cy="6.5" r="1.5"/>
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
    </svg>
  )
}

export function Footer() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSent(false)
    setLoading(true)
    setError('')
    try {
      await submitEnquiry({ name, email, phone: '', message })
      setSent(true)
      setName('')
      setEmail('')
      setMessage('')
    } catch {
      setError('Failed to send. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>

        {/* Left — info */}
        <div className={styles.info}>
          <div className={styles.block}>
            <p className={styles.colTitle}>Navigate</p>
            <Link to="/shop" className={styles.navLink}>Shop</Link>
            <Link to="/contact" className={styles.navLink}>Contact</Link>
          </div>

          <div className={styles.block}>
            <p className={styles.colTitle}>Get in Touch</p>
            <a href={`tel:${PHONE.replace(/\s/g, '')}`} className={styles.contactText}>{PHONE}</a>
            <a href={`mailto:${EMAIL}`} className={styles.contactText}>{EMAIL}</a>
          </div>

          <div className={styles.block}>
            <p className={styles.colTitle}>Follow</p>
            <div className={styles.social}>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialBtn}
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialBtn}
                aria-label="TikTok"
              >
                <TikTokIcon />
              </a>
            </div>
          </div>
        </div>

        {/* Right — contact form */}
        <form onSubmit={(e) => void handleSubmit(e)} className={styles.formCol}>
          <p className={styles.formTitle}>Send a Message</p>
          <input
            className={styles.input}
            type="text"
            placeholder="Name"
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <textarea
            className={styles.textarea}
            placeholder="Message"
            aria-label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          {sent && <p className={styles.successMsg}>Message sent — we&apos;ll be in touch.</p>}
          {error && <p className={styles.errorMsg}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Sending…' : 'Send Message'}
          </button>
        </form>

      </div>

      <p className={styles.copyright}>© {new Date().getFullYear()} AlienzStore</p>
    </footer>
  )
}
