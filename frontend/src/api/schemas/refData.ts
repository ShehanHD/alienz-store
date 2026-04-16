import { z } from 'zod'

export const RefItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  hex: z.string().optional(),
  sort_order: z.number().int(),
})

export const RefItemListSchema = z.array(RefItemSchema)
