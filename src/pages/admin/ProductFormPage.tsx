import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAdminProducts, createProduct, updateProduct } from '../../api/admin'
import { getCategories } from '../../api/categories'
import { Spinner } from '../../components/ui/Spinner'
import type { Category, Product } from '../../types'
import styles from './ProductFormPage.module.css'

export function ProductFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    void getCategories().then(setCategories)
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    setLoading(true)
    setLoadError(null)
    getAdminProducts({ page: 1, page_size: 200 })
      .then((data) => {
        const found = data.items.find((p) => p.id === id) ?? null
        if (!found) {
          setLoadError('Product not found.')
        }
        setProduct(found)
      })
      .catch(() => setLoadError('Failed to load product. Please try again.'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formRef.current) return

    const formData = new FormData(formRef.current)
    setSubmitError(null)
    setSubmitting(true)

    try {
      if (isEdit && id) {
        await updateProduct(id, formData)
      } else {
        await createProduct(formData)
      }
      navigate('/admin/products')
    } catch {
      setSubmitError('Failed to save product. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  return (
    <div className={styles.page}>
      <h1>{isEdit ? 'Edit Product' : 'New Product'}</h1>

      {submitError && (
        <p role="alert" className={styles.error}>{submitError}</p>
      )}

      <form ref={formRef} onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={product?.name ?? ''}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            required
            defaultValue={product?.description ?? ''}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="price">Price</label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product?.price ?? ''}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="category_id">Category</label>
          <select id="category_id" name="category_id" defaultValue={product?.category_id ?? ''} required>
            <option value="" disabled>Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="sizes">Sizes (comma-separated)</label>
          <input
            id="sizes"
            name="sizes"
            type="text"
            defaultValue={product?.sizes.join(', ') ?? ''}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="colors">Colors (comma-separated)</label>
          <input
            id="colors"
            name="colors"
            type="text"
            defaultValue={product?.colors.join(', ') ?? ''}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="image">Image</label>
          <input id="image" name="image" type="file" accept="image/*" />
        </div>

        <div className={styles.field}>
          <label>
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={product?.is_active ?? true}
            />
            {' '}Active
          </label>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={() => navigate('/admin/products')}>Cancel</button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
