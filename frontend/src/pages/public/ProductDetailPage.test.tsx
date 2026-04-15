import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, it, vi } from 'vitest'
import { ProductDetailPage } from './ProductDetailPage'

const mockProduct = {
  id: '1', name: 'Blue Dress', slug: 'blue-dress', description: 'Nice',
  price: 49.99, category_id: 'c1', category_ids: ['c1'],
  category: { id: 'c1', name: 'Dresses', slug: 'dresses', sort_order: 1, show_in_navbar: true },
  sizes: ['S', 'M'], colors: ['Blue'],
  is_active: true, is_featured: false,
  models: ['Regular'], fits: ['Slim'], materials: ['Cotton', 'Linen'],
  accessory_styles: ['Casual'],
  images: [], created_at: '', updated_at: '',
}

vi.mock('../../api/products', () => ({
  getProduct: vi.fn(),
  getProductFilters: vi.fn().mockResolvedValue({ colors: [] }),
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

it('shows category chip', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => {
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Dresses')).toBeInTheDocument()
  })
})

it('shows materials chips', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => {
    expect(screen.getByText('Materials')).toBeInTheDocument()
    expect(screen.getByText('Cotton')).toBeInTheDocument()
    expect(screen.getByText('Linen')).toBeInTheDocument()
  })
})

it('shows fits chips', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => {
    expect(screen.getByText('Fits')).toBeInTheDocument()
    expect(screen.getByText('Slim')).toBeInTheDocument()
  })
})

it('shows models chips', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => {
    expect(screen.getByText('Models')).toBeInTheDocument()
    expect(screen.getByText('Regular')).toBeInTheDocument()
  })
})

it('shows accessory_styles chips', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => {
    expect(screen.getByText('Style')).toBeInTheDocument()
    expect(screen.getByText('Casual')).toBeInTheDocument()
  })
})

it('does not render empty attribute groups', async () => {
  const { getProduct } = await import('../../api/products')
  vi.mocked(getProduct).mockResolvedValueOnce({
    ...mockProduct,
    category: undefined,
    materials: [],
    fits: [],
    models: [],
    accessory_styles: [],
  } as any)
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByText('Blue Dress')).toBeInTheDocument())
  expect(screen.queryByText('Category')).not.toBeInTheDocument()
  expect(screen.queryByText('Materials')).not.toBeInTheDocument()
  expect(screen.queryByText('Fits')).not.toBeInTheDocument()
  expect(screen.queryByText('Models')).not.toBeInTheDocument()
  expect(screen.queryByText('Style')).not.toBeInTheDocument()
})
