import { z } from 'zod'

export const EnquiryStatusSchema = z.enum(['new', 'read', 'replied'])

export const EnquirySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  product_id: z.string().uuid().nullable(),
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
  status: EnquiryStatusSchema,
  created_at: z.string(),
})

export const PaginatedEnquiriesSchema = z.object({
  items: z.array(EnquirySchema),
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
})
