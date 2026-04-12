import { getApiClient } from './client'
import { WishlistSchema } from './schemas/wishlist'
import type { WishlistItem } from '../types'

export async function getWishlist(): Promise<WishlistItem[]> {
  const res = await getApiClient().get('/account/wishlist')
  return WishlistSchema.parse(res.data)
}

export async function addToWishlist(product_id: string): Promise<void> {
  await getApiClient().post('/account/wishlist', { product_id })
}

export async function removeFromWishlist(product_id: string): Promise<void> {
  await getApiClient().delete(`/account/wishlist/${product_id}`)
}
