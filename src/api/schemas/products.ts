import { z } from 'zod'

export const ProductImageSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  url: z.string(),
  thumbnail_url: z.string(),
  is_primary: z.boolean(),
  sort_order: z.number().int(),
})

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  price: z.number(),
  category_id: z.string().uuid(),
  category: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string(), sort_order: z.number() }).optional(),
  sizes: z.array(z.string()),
  colors: z.array(z.string()),
  is_active: z.boolean(),
  images: z.array(ProductImageSchema),
  created_at: z.string(),
  updated_at: z.string(),
})

export const PaginatedProductsSchema = z.object({
  items: z.array(ProductSchema),
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
})
