import { z } from 'zod'

export const EnquiryStatusSchema = z.enum(['new', 'read', 'accepted', 'rejected'])

export const EnquirySchema = z.object({
  id: z.string(),
  user_id: z.string().nullable().default(null),
  product_id: z.string().nullable().default(null),
  name: z.string(),
  email: z.string(),
  phone: z.string().default(''),
  message: z.string().default(''),
  size: z.string().default(''),
  color: z.string().default(''),
  quantity: z.number().int().min(1).default(1),
  status: EnquiryStatusSchema,
  rejection_reason: z.string().nullable().default(null),
  created_at: z.string(),
})

export const PaginatedEnquiriesSchema = z.object({
  items: z.array(EnquirySchema),
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
})
