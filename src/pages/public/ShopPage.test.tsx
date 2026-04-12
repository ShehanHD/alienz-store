import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { ShopPage } from './ShopPage'

vi.mock('../../api/products', () => ({
  getProducts: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 }),
}))
vi.mock('../../api/categories', () => ({
  getCategories: vi.fn().mockResolvedValue([]),
}))

it('renders shop page with empty state', async () => {
  render(<MemoryRouter><ShopPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByText(/no products/i)).toBeInTheDocument())
})
