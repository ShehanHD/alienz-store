import { z } from 'zod'

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  sort_order: z.number().int(),
  show_in_navbar: z.boolean().default(false),
})

export const CategoriesListSchema = z.array(CategorySchema)
