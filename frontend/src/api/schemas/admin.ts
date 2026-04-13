import { z } from 'zod'

export const AdminDashboardSchema = z.object({
  products: z.object({
    total: z.number().int(),
    active: z.number().int(),
    max: z.number().int(),
  }),
  enquiries: z.object({
    total: z.number().int(),
    new: z.number().int(),
  }),
  clients: z.object({
    total: z.number().int(),
  }),
  storage: z.object({
    quota_mb: z.number().int(),
  }),
})

export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['client', 'admin', 'owner']),
  first_name: z.string(),
  last_name: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
})

export const PaginatedAdminUsersSchema = z.object({
  items: z.array(AdminUserSchema),
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
})

export const SiteConfigSchema = z.object({
  key: z.string(),
  value: z.string(),
  updated_at: z.string(),
})
