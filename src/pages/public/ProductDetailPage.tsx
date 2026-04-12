import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProduct } from '../../api/products'
import { submitEnquiry } from '../../api/enquiries'
import { ImageGallery } from '../../components/ui/ImageGallery'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { useAuth } from '../../hooks/useAuth'
import type { Product } from '../../types'
import styles from './ProductDetailPage.module.css'

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showEnquiry, setShowEnquiry] = useState(false)
  const [name, setName] = useState(user ? `${user.first_name} ${user.last_name}` : '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!slug) return
    void getProduct(slug)
      .then(setProduct)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setSending(true)
    try {
      await submitEnquiry({ name, email, message, product_id: product.id })
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <Spinner />
  if (error || !product) return <p>Product not found.</p>

  return (
    <div className={styles.page}>
      <ImageGallery images={product.images} alt={product.name} />
      <div className={styles.info}>
        <h1>{product.name}</h1>
        <p className={styles.price}>€{product.price.toFixed(2)}</p>
        <p>{product.description}</p>
        {product.sizes.length > 0 && <p>Sizes: {product.sizes.join(', ')}</p>}
        {product.colors.length > 0 && <p>Colors: {product.colors.join(', ')}</p>}
        {!showEnquiry && <Button onClick={() => setShowEnquiry(true)}>Enquire</Button>}
        {showEnquiry && !sent && (
          <form onSubmit={(e) => void handleEnquiry(e)} className={styles.enquiry}>
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div>
              <label htmlFor="msg">Message</label>
              <textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} />
            </div>
            <Button type="submit" loading={sending}>Send Enquiry</Button>
          </form>
        )}
        {sent && <p>Enquiry sent! We&apos;ll be in touch.</p>}
      </div>
    </div>
  )
}
