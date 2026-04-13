import { z } from 'zod'
import { ProductSchema } from './products'

export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  product_id: z.string().uuid(),
  product: ProductSchema.optional(),
  created_at: z.string(),
})

export const WishlistSchema = z.array(WishlistItemSchema)
