import { describe, it, expectTypeOf } from 'vitest'
import type { User, Product, PaginatedResponse, Role } from './index'

describe('Types', () => {
  it('Role type is correct', () => {
    const r: Role = 'client'
    expectTypeOf(r).toEqualTypeOf<'client' | 'admin' | 'owner'>()
  })

  it('PaginatedResponse is generic', () => {
    type PR = PaginatedResponse<User>
    expectTypeOf<PR['items']>().toEqualTypeOf<User[]>()
  })
})
