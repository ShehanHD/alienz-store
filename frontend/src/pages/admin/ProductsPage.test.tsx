import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { ProductsPage } from './ProductsPage'

vi.mock('../../api/admin', () => ({
  getAdminProducts: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 }),
  deleteProduct: vi.fn(),
}))

it('shows empty products state', async () => {
  render(<MemoryRouter><ProductsPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByText(/no products/i)).toBeInTheDocument())
})
