import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, it, vi } from 'vitest'
import { ProductDetailPage } from './ProductDetailPage'

const mockProduct = {
  id: '1', name: 'Blue Dress', slug: 'blue-dress', description: 'Nice',
  price: 49.99, category_id: 'c1', sizes: ['S', 'M'], colors: ['Blue'],
  is_active: true, images: [], created_at: '', updated_at: '',
}

vi.mock('../../api/products', () => ({
  getProduct: vi.fn(),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ user: null }),
}))

beforeEach(async () => {
  const { getProduct } = await import('../../api/products')
  vi.mocked(getProduct).mockResolvedValue(mockProduct)
})

it('shows product name and price', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByText('Blue Dress')).toBeInTheDocument())
  expect(screen.getByText('€49.99')).toBeInTheDocument()
})

it('shows not found message when product fetch fails', async () => {
  const { getProduct } = await import('../../api/products')
  vi.mocked(getProduct).mockRejectedValueOnce(new Error('Not found'))
  render(
    <MemoryRouter initialEntries={['/shop/missing']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByText(/product not found/i)).toBeInTheDocument())
})
