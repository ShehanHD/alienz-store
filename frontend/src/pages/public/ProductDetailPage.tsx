import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProduct, getProductFilters, getProducts } from '../../api/products'
import type { ProductFilterColor } from '../../api/products'
import { submitEnquiry } from '../../api/enquiries'
import { ImageGallery } from '../../components/ui/ImageGallery'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/PageLoader'
import { ProductCard } from '../../components/ui/ProductCard'
import { useAuth } from '../../hooks/useAuth'
import type { Product } from '../../types'
import styles from './ProductDetailPage.module.css'

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [colorMap, setColorMap] = useState<Record<string, string>>({})
  const [suggested, setSuggested] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Enquiry form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [enquiryError, setEnquiryError] = useState<string | null>(null)
  const [descOpen, setDescOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    if (!slug) { setLoading(false); return }
    void getProduct(slug)
      .then(setProduct)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
    void getProductFilters()
      .then((f) => {
        const map: Record<string, string> = {}
        f.colors.forEach((c: ProductFilterColor) => { map[c.name] = c.hex })
        setColorMap(map)
      })
      .catch(() => {})
  }, [slug])

  // Fetch suggested products once the product is known
  useEffect(() => {
    if (!product?.category?.slug) return
    void getProducts({ category: product.category.slug, page_size: 5 })
      .then((res) => setSuggested(res.items.filter((r: Product) => r.id !== product.id).slice(0, 4)))
      .catch(() => {})
  }, [product?.id, product?.category?.slug])

  // Sync user data when available
  useEffect(() => {
    if (user) {
      setName(`${user.first_name} ${user.last_name}`.trim())
      setEmail(user.email)
      setPhone(user.phone ?? '')
    }
  }, [user])

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    if (!selectedSize && product.sizes.length > 0) {
      setEnquiryError('Please select a size.')
      return
    }
    if (!selectedColor && product.colors.length > 0) {
      setEnquiryError('Please select a colour.')
      return
    }
    setSending(true)
    setEnquiryError(null)
    try {
      await submitEnquiry({
        name: user ? `${user.first_name} ${user.last_name}`.trim() : name,
        email: user ? user.email : email,
        phone: user ? (user.phone ?? phone) : phone,
        size: selectedSize,
        color: selectedColor,
        quantity,
        message,
        product_id: product.id,
      })
      setSent(true)
    } catch {
      setEnquiryError('Failed to send enquiry. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <PageLoader />
  if (error || !product) return <p>Product not found.</p>

  return (
    <>
    <div className={styles.page}>
      <ImageGallery images={product.images} alt={product.name} />

      <div className={styles.info}>
        <h1>{product.name}</h1>
        <p className={styles.price}>€{product.price.toFixed(2)}</p>

        {!sent && (
          <form onSubmit={(e) => void handleEnquiry(e)} className={styles.enquiry}>
            <h2 className={styles.enquiryTitle}>Send Enquiry</h2>

            {/* Guest fields — hidden when logged in */}
            {!user && (
              <>
                <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </>
            )}

            {/* Size selection */}
            {product.sizes.length > 0 && (
              <div className={styles.selectorField}>
                <label className={styles.selectorLabel}>Size <span className={styles.required}>*</span></label>
                <div className={styles.chips}>
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.chip} ${selectedSize === s ? styles.chipActive : ''}`}
                      onClick={() => setSelectedSize(s)}
                      aria-pressed={selectedSize === s}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Color selection */}
            {product.colors.length > 0 && (
              <div className={styles.selectorField}>
                <label className={styles.selectorLabel}>Colour <span className={styles.required}>*</span></label>
                <div className={styles.colorChips}>
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.colorChip} ${selectedColor === c ? styles.colorChipActive : ''}`}
                      onClick={() => setSelectedColor(c)}
                      aria-pressed={selectedColor === c}
                      title={c}
                    >
                      <span
                        className={styles.colorCircle}
                        style={{
                          background: colorMap[c] ?? '#ccc',
                          border: colorMap[c] === '#ffffff' ? '1px solid #e8e8e8' : 'none',
                        }}
                      />
                      <span className={styles.colorName}>{c}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className={styles.selectorField}>
              <label className={styles.selectorLabel}>Quantity</label>
              <div className={styles.quantityStepper}>
                <button
                  type="button"
                  className={styles.quantityBtn}
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >−</button>
                <input
                  type="number"
                  className={styles.quantityValue}
                  value={quantity}
                  min={1}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v) && v >= 1) setQuantity(v)
                  }}
                  aria-label="Quantity"
                />
                <button
                  type="button"
                  className={styles.quantityBtn}
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => q + 1)}
                >+</button>
              </div>
            </div>

            {/* Optional message */}
            <div className={styles.selectorField}>
              <label className={styles.selectorLabel}>Message <span className={styles.optional}>(optional)</span></label>
              <textarea
                className={styles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Any additional details…"
              />
            </div>

            {enquiryError && <p className={styles.enquiryError} role="alert">{enquiryError}</p>}

            <Button type="submit" loading={sending}>Send Enquiry</Button>
          </form>
        )}

        {sent && <p className={styles.sentMessage}>Enquiry sent! We&apos;ll be in touch.</p>}

        {/* Accordion */}
        <div className={styles.accordion}>
          {product.description && (
            <div className={styles.accordionItem}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => setDescOpen((o) => !o)}
                aria-expanded={descOpen}
              >
                <span>Product Description</span>
                <span className={styles.accordionChevron} aria-hidden="true">{descOpen ? '−' : '+'}</span>
              </button>
              <div className={descOpen ? styles.accordionBody : styles.accordionBodyHidden}>
                <p className={styles.description}>{product.description}</p>
              </div>
            </div>
          )}
          {(product.category || product.materials.length > 0 || product.fits.length > 0 || product.models.length > 0 || product.accessory_styles.length > 0) && (
            <div className={styles.accordionItem}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => setDetailsOpen((o) => !o)}
                aria-expanded={detailsOpen}
              >
                <span>Product Details</span>
                <span className={styles.accordionChevron} aria-hidden="true">{detailsOpen ? '−' : '+'}</span>
              </button>
              <div className={detailsOpen ? styles.accordionBody : styles.accordionBodyHidden}>
                <div className={styles.attributes}>
                  {product.category && (
                    <div className={styles.selectorField}>
                      <span className={styles.selectorLabel}>Category</span>
                      <div className={styles.chips}>
                        <span className={styles.chipStatic}>{product.category.name}</span>
                      </div>
                    </div>
                  )}
                  {product.materials.length > 0 && (
                    <div className={styles.selectorField}>
                      <span className={styles.selectorLabel}>Materials</span>
                      <div className={styles.chips}>
                        {product.materials.map((m) => (
                          <span key={m} className={styles.chipStatic}>{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.fits.length > 0 && (
                    <div className={styles.selectorField}>
                      <span className={styles.selectorLabel}>Fits</span>
                      <div className={styles.chips}>
                        {product.fits.map((f) => (
                          <span key={f} className={styles.chipStatic}>{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.models.length > 0 && (
                    <div className={styles.selectorField}>
                      <span className={styles.selectorLabel}>Models</span>
                      <div className={styles.chips}>
                        {product.models.map((m) => (
                          <span key={m} className={styles.chipStatic}>{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.accessory_styles.length > 0 && (
                    <div className={styles.selectorField}>
                      <span className={styles.selectorLabel}>Style</span>
                      <div className={styles.chips}>
                        {product.accessory_styles.map((s) => (
                          <span key={s} className={styles.chipStatic}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {suggested.length > 0 && (
      <section className={styles.suggested}>
        <h2 className={styles.suggestedTitle}>You May Also Like</h2>
        <div className={styles.suggestedGrid}>
          {suggested.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    )}
    </>
  )
}
