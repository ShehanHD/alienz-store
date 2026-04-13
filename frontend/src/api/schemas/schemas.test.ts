import { describe, it, expect } from 'vitest'
import { UserSchema } from './auth'
import { AdminDashboardSchema } from './admin'

describe('Schemas', () => {
  it('UserSchema parses valid user', () => {
    const result = UserSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test@example.com',
      role: 'client',
      first_name: 'Alice',
      last_name: 'Smith',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('AdminDashboardSchema parses nested backend response', () => {
    const result = AdminDashboardSchema.safeParse({
      products: { total: 10, active: 8, max: 100 },
      enquiries: { total: 5, new: 2 },
      clients: { total: 20 },
      storage: { quota_mb: 500 },
    })
    expect(result.success).toBe(true)
  })

  it('AdminDashboardSchema rejects flat (wrong) structure', () => {
    const result = AdminDashboardSchema.safeParse({
      product_count: 10,
      enquiry_count: 5,
      storage_used_mb: 100,
      storage_quota_mb: 500,
      new_enquiries: 2,
    })
    expect(result.success).toBe(false)
  })
})
