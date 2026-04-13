import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminProducts, deleteProduct } from '../../api/admin'
import { Spinner } from '../../components/ui/Spinner'
import type { PaginatedResponse, Product } from '../../types'
import styles from './ProductsPage.module.css'

export function ProductsPage() {
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  function load(p: number) {
    setLoading(true)
    setError(null)
    getAdminProducts({ page: p, page_size: 20 })
      .then(setData)
      .catch(() => setError('Failed to load products. Please try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(page)
  }, [page])

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this product?')) return
    setDeleteError(null)
    try {
      await deleteProduct(id)
      load(page)
    } catch {
      setDeleteError('Failed to delete product. Please try again.')
    }
  }

  if (loading) return <Spinner />
  if (error) return <p role="alert" className={styles.error}>{error}</p>

  const items = data?.items ?? []

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Products</h1>
        <Link to="/admin/products/new" className={styles.addButton}>Add Product</Link>
      </div>

      {deleteError && (
        <p role="alert" className={styles.error}>{deleteError}</p>
      )}

      {items.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>€{product.price.toFixed(2)}</td>
                <td>{product.is_active ? 'Yes' : 'No'}</td>
                <td className={styles.actions}>
                  <Link to={`/admin/products/${product.id}`}>Edit</Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(product.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data && data.total > data.page_size && (
        <div className={styles.pagination}>
          {page > 1 && (
            <button type="button" onClick={() => setPage((p) => p - 1)}>Prev</button>
          )}
          <span>Page {page}</span>
          {data.total > page * data.page_size && (
            <button type="button" onClick={() => setPage((p) => p + 1)}>Next</button>
          )}
        </div>
      )}
    </div>
  )
}
