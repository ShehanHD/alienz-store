import { describe, it, expectTypeOf } from 'vitest'
import type { User, PaginatedResponse, Role } from './index'

describe('Types', () => {
  it('Role type is correct', () => {
    expectTypeOf<Role>().toEqualTypeOf<'client' | 'admin' | 'owner'>()
  })

  it('PaginatedResponse is generic', () => {
    type PR = PaginatedResponse<User>
    expectTypeOf<PR['items']>().toEqualTypeOf<User[]>()
  })
})
