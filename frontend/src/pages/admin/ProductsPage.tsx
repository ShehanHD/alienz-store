import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2, ChevronLeft, ChevronRight, Star, Eye, EyeOff } from 'lucide-react'

import { getAdminProducts, deleteProduct } from '../../api/admin'
import { PageLoader } from '../../components/ui/PageLoader'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import type { PaginatedResponse, Product } from '../../types'
import styles from './ProductsPage.module.css'

export function ProductsPage() {
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const { toast } = useToast()
  const confirm = useConfirm()

  function load(p: number) {
    setLoading(true)
    setError(null)
    getAdminProducts({ page: p, page_size: 20 })
      .then(setData)
      .catch(() => setError('Failed to load products. Please try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  async function handleDelete(id: string) {
    const ok = await confirm('Delete this product? This cannot be undone.', { title: 'Delete Product', confirmLabel: 'Delete', variant: 'danger' })
    if (!ok) return
    try {
      await deleteProduct(id)
      toast('Product deleted.', 'success')
      setData((prev) => prev ? { ...prev, items: prev.items.filter((p) => p.id !== id), total: prev.total - 1 } : prev)
    } catch {
      toast('Failed to delete product. Please try again.', 'error')
    }
  }

  if (loading) return <PageLoader />
  if (error) return <p role="alert" className={styles.error}>{error}</p>

  const items = data?.items ?? []

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Products</h1>
        <Link to="/admin/products/new" className={styles.addButton}>Add Product</Link>
      </div>

      {items.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <colgroup>
            <col className={styles.colName} />
            <col className={styles.colNarrow} />
            <col className={styles.colNarrow} />
            <col className={styles.colNarrow} />
            <col className={styles.colActions} />
          </colgroup>
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Active</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>€{product.price.toFixed(2)}</td>
                <td>
                  {product.is_active
                    ? <Eye size={14} strokeWidth={1.5} className={styles.iconOn} aria-label="Active" />
                    : <EyeOff size={14} strokeWidth={1.5} className={styles.iconOff} aria-label="Inactive" />}
                </td>
                <td>
                  {product.is_featured
                    ? <Star size={14} strokeWidth={1.5} className={styles.iconOn} fill="currentColor" aria-label="Featured" />
                    : <Star size={14} strokeWidth={1.5} className={styles.iconOff} aria-label="Not featured" />}
                </td>
                <td className={styles.actions}>
                  <Link to={`/admin/products/${product.id}`} className={styles.iconBtn} title="Edit product">
                    <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => void handleDelete(product.id)}
                    title="Delete product"
                    aria-label="Delete product"
                  >
                    <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {data && data.total > data.page_size && (
        <div className={styles.pagination}>
          {page > 1 && (
            <button type="button" className={styles.pageBtn} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft size={14} strokeWidth={1.5} />
            </button>
          )}
          <span>Page {page}</span>
          {data.total > page * data.page_size && (
            <button type="button" className={styles.pageBtn} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
