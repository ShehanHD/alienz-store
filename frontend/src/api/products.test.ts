import { vi } from 'vitest'
import { getProducts } from './products'

vi.mock('./client', () => ({
  getApiClient: vi.fn(() => ({
    get: vi.fn().mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20 },
    }),
  })),
}))

it('getProducts returns paginated response', async () => {
  const result = await getProducts({ page: 1 })
  expect(result.items).toEqual([])
  expect(result.total).toBe(0)
})
