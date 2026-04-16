import { z } from 'zod'

export const ProductImageSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  url: z.string(),
  thumbnail_url: z.string(),
  is_primary: z.boolean(),
  sort_order: z.number().int(),
})

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().default(''),
  price: z.coerce.number(),
  category_id: z.string().nullable().default(null),
  category_ids: z.array(z.string()).default([]),
  category: z.object({ id: z.string(), name: z.string(), slug: z.string(), sort_order: z.number(), show_in_navbar: z.boolean().default(false) }).optional(),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  models: z.array(z.string()).default([]),
  fits: z.array(z.string()).default([]),
  materials: z.array(z.string()).default([]),
  accessory_styles: z.array(z.string()).default([]),
  is_active: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  images: z.array(ProductImageSchema).default([]),
  created_at: z.string().default(''),
  updated_at: z.string().default(''),
}).passthrough()

export const PaginatedProductsSchema = z.object({
  items: z.array(ProductSchema),
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
})
