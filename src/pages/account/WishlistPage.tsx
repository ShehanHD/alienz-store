import { useEffect, useState } from 'react'
import { getWishlist, removeFromWishlist } from '../../api/wishlist'
import type { WishlistItem } from '../../types'
import styles from './WishlistPage.module.css'

export function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getWishlist()
      .then(setItems)
      .catch(() => setError('Failed to load wishlist. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleRemove(productId: string) {
    try {
      await removeFromWishlist(productId)
      setItems((prev) => prev.filter((item) => item.product_id !== productId))
    } catch {
      setError('Failed to remove item. Please try again.')
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Wishlist</h1>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading && <p>Loading…</p>}
      {!loading && !error && items.length === 0 && (
        <p className={styles.empty}>Your wishlist is empty.</p>
      )}
      {!loading && items.length > 0 && (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              <span>{item.product?.name ?? item.product_id}</span>
              <button
                className={styles.removeBtn}
                onClick={() => void handleRemove(item.product_id)}
                aria-label={`Remove ${item.product?.name ?? item.product_id} from wishlist`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
