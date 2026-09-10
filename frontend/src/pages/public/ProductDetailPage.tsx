import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Skeleton, Accordion, NumberInput, Textarea, Container, Grid, Stack, Chips } from '@shehandon/vcs-ui'
import type { AccordionItem } from '@shehandon/vcs-ui'
import { getProduct, getProductFilters, getProducts } from '../../api/products'
import type { ProductFilterColor } from '../../api/products'
import { submitEnquiry } from '../../api/enquiries'
import { ImageGallery } from '../../components/ui/ImageGallery'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Chip } from '../../components/ui/Chip'
import { ProductCard } from '../../components/ui/ProductCard'
import { useAuth } from '../../hooks/useAuth'
import type { Product } from '../../types'
import styles from './ProductDetailPage.module.css'

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([])

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
      .then((res) => setSuggested(res.items.filter((r: Product) => r.id !== product.id).slice(0, 3)))
      .catch(() => {})
  }, [product?.id, product?.category?.slug])

  const handleBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate('/shop')
  }

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

  if (loading) {
    return (
      <Container size="lg" padding="6">
        <Grid columns={{ base: 1, md: 2 }} gap="12">
          <Skeleton variant="rect" animation="shimmer" className={styles.imageSkeleton} />
          <Stack direction="column" gap="6">
            <Skeleton variant="rect" animation="shimmer" className={styles.titleSkeleton} />
            <Skeleton variant="rect" animation="shimmer" className={styles.priceSkeleton} />
            <Skeleton variant="text" animation="shimmer" className={styles.lineSkeleton} />
            <Skeleton variant="text" animation="shimmer" className={styles.lineSkeleton} />
            <Skeleton variant="text" animation="shimmer" className={`${styles.lineSkeleton} ${styles.lineSkeletonShort}`} />
          </Stack>
        </Grid>
      </Container>
    )
  }
  if (error || !product) return <p>Product not found.</p>

  const hasDetails = !!(product.category || product.materials.length > 0 || product.fits.length > 0 || product.models.length > 0 || product.accessory_styles.length > 0)

  const accordionItems: AccordionItem[] = [
    ...(product.description ? [{
      value: 'description',
      title: 'Product Description',
      content: <p className={styles.description}>{product.description}</p>,
    }] : []),
    ...(hasDetails ? [{
      value: 'details',
      title: 'Product Details',
      content: (
        <Stack direction="column" gap="4">
          {product.category && (
            <Stack direction="column" gap="2">
              <span className={styles.selectorLabel}>Category</span>
              <Stack direction="row" wrap gap="2">
                <span className={styles.chipStatic}>{product.category.name}</span>
              </Stack>
            </Stack>
          )}
          {product.materials.length > 0 && (
            <Stack direction="column" gap="2">
              <span className={styles.selectorLabel}>Materials</span>
              <Stack direction="row" wrap gap="2">
                {product.materials.map((m) => (
                  <span key={m} className={styles.chipStatic}>{m}</span>
                ))}
              </Stack>
            </Stack>
          )}
          {product.fits.length > 0 && (
            <Stack direction="column" gap="2">
              <span className={styles.selectorLabel}>Fits</span>
              <Stack direction="row" wrap gap="2">
                {product.fits.map((f) => (
                  <span key={f} className={styles.chipStatic}>{f}</span>
                ))}
              </Stack>
            </Stack>
          )}
          {product.models.length > 0 && (
            <Stack direction="column" gap="2">
              <span className={styles.selectorLabel}>Models</span>
              <Stack direction="row" wrap gap="2">
                {product.models.map((m) => (
                  <span key={m} className={styles.chipStatic}>{m}</span>
                ))}
              </Stack>
            </Stack>
          )}
          {product.accessory_styles.length > 0 && (
            <Stack direction="column" gap="2">
              <span className={styles.selectorLabel}>Style</span>
              <Stack direction="row" wrap gap="2">
                {product.accessory_styles.map((s) => (
                  <span key={s} className={styles.chipStatic}>{s}</span>
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      ),
    }] : []),
  ]

  return (
    <>
    <Container size="lg" padding="6">
      <button type="button" className={styles.backButton} onClick={handleBack}>
        ← Back
      </button>
    </Container>
    <Container size="lg" padding="6">
      <Grid columns={{ base: 1, md: 2 }} gap="12">
        <ImageGallery images={product.images} alt={product.name} />

        <Stack direction="column" gap="6">
          <h1 className={styles.title}>{product.name}</h1>
          <p className={styles.price}>€{product.price.toFixed(2)}</p>

          {!sent && (
            <Stack as="form" direction="column" gap="4" onSubmit={(e) => void handleEnquiry(e)} className={styles.enquiry}>
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
                <Stack direction="column" gap="2">
                  <label className={styles.selectorLabel}>Size <span className={styles.required}>*</span></label>
                  <Chips
                    mode="single"
                    options={product.sizes}
                    value={selectedSize ? [selectedSize] : []}
                    onChange={(v) => setSelectedSize(v[0] ?? '')}
                  />
                </Stack>
              )}

              {/* Color selection */}
              {product.colors.length > 0 && (
                <Stack direction="column" gap="2">
                  <label className={styles.selectorLabel}>Colour <span className={styles.required}>*</span></label>
                  <Stack direction="row" wrap gap="2">
                    {product.colors.map((c) => (
                      <Chip
                        key={c}
                        selected={selectedColor === c}
                        onClick={() => setSelectedColor(c)}
                        title={c}
                        icon={
                          <span
                            className={styles.colorCircle}
                            style={{
                              background: colorMap[c] ?? 'var(--border-strong)',
                              border: colorMap[c] === '#ffffff' ? '1px solid var(--border)' : 'none',
                            }}
                          />
                        }
                      >
                        {c}
                      </Chip>
                    ))}
                  </Stack>
                </Stack>
              )}

              {/* Quantity */}
              <Stack direction="column" align="start" gap="2">
                <label className={styles.selectorLabel}>Quantity</label>
                <NumberInput
                  layout="flanking"
                  min={1}
                  value={quantity}
                  onChange={(v) => setQuantity(v)}
                />
              </Stack>

              {/* Optional message */}
              <Textarea
                label="Message"
                helperText="(optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Any additional details…"
              />

              {enquiryError && <p className={styles.enquiryError} role="alert">{enquiryError}</p>}

              <Button type="submit" loading={sending}>Send Enquiry</Button>
            </Stack>
          )}

          {sent && <p className={styles.sentMessage}>Enquiry sent! We&apos;ll be in touch.</p>}

          {/* Accordion */}
          <Accordion
            items={accordionItems}
            type="multiple"
            value={openAccordionItems}
            onChange={(v) => setOpenAccordionItems(Array.isArray(v) ? v : [v])}
            variant="separated"
          />
        </Stack>
      </Grid>
    </Container>

    {suggested.length > 0 && (
      <Container size="lg" padding="6">
        <h2 className={styles.suggestedTitle}>You May Also Like</h2>
        <Grid columns={{ base: 2, md: 3 }} gap="6">
          {suggested.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </Grid>
      </Container>
    )}
    </>
  )
}
