import { useEffect, useState } from 'react'
import { Container, Grid, Stack } from '@shehandon/vcs-ui'
import { getWishlist, removeFromWishlist } from '../../api/wishlist'
import { ProductCard } from '../../components/ui/ProductCard'
import { PageLoader } from '../../components/ui/PageLoader'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../contexts/ConfirmContext'
import type { WishlistItem } from '../../types'
import styles from './WishlistPage.module.css'

export function WishlistPage() {
  const confirm = useConfirm()
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
    const ok = await confirm('Remove this item from your wishlist?', { title: 'Remove from Wishlist', confirmLabel: 'Remove', variant: 'danger' })
    if (!ok) return
    try {
      await removeFromWishlist(productId)
      setItems((prev) => prev.filter((item) => item.product_id !== productId))
    } catch {
      setError('Failed to remove item. Please try again.')
    }
  }

  return (
    <Container size="lg" padding="6">
      <h1 className={styles.title}>Wishlist</h1>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading && <PageLoader />}
      {!loading && !error && items.length === 0 && (
        <p className={styles.empty}>Your wishlist is empty.</p>
      )}
      {!loading && items.length > 0 && (
        <Grid minColWidth="240px" gap="6">
          {items.map((item) => (
            <Stack key={item.id} direction="column" gap="3">
              {item.product && <ProductCard product={item.product} />}
              <Button
                variant="secondary"
                onClick={() => void handleRemove(item.product_id)}
                aria-label={`Remove ${item.product?.name ?? item.product_id} from wishlist`}
              >
                Remove
              </Button>
            </Stack>
          ))}
        </Grid>
      )}
    </Container>
  )
}
