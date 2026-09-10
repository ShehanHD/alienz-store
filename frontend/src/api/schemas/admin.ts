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
    // Added stats — defaulted so a not-yet-redeployed backend still parses.
    by_status: z.object({
      new: z.number().int(),
      read: z.number().int(),
      accepted: z.number().int(),
      rejected: z.number().int(),
    }).default({ new: 0, read: 0, accepted: 0, rejected: 0 }),
    last_14_days: z.array(z.object({
      date: z.string(),
      count: z.number().int(),
    })).default([]),
  }),
  clients: z.object({
    total: z.number().int(),
    new_30d: z.number().int().default(0),
    prev_30d: z.number().int().default(0),
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
  phone: z.string().default(''),
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
