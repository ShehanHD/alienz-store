import { z } from 'zod'

export const AddressSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  street: z.string(),
  city: z.string(),
  country: z.string(),
  postal_code: z.string(),
  is_default: z.boolean(),
})
