import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WishlistPage } from './WishlistPage'

const mockGetWishlist = vi.hoisted(() => vi.fn())
const mockRemoveFromWishlist = vi.hoisted(() => vi.fn())

vi.mock('../../api/wishlist', () => ({
  getWishlist: mockGetWishlist,
  removeFromWishlist: mockRemoveFromWishlist,
}))

// Mock ProductCard to simplify testing
vi.mock('../../components/ui/ProductCard', () => ({
  ProductCard: ({ product }: { product: { name: string } }) => <div>{product.name}</div>,
}))

const mockProduct = {
  id: 'prod-1',
  name: 'Test Product',
  slug: 'test-product',
  description: 'A test product',
  price: 29.99,
  category_id: 'cat-1',
  sizes: ['S', 'M'],
  colors: ['red'],
  is_active: true,
  images: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockWishlistItem = {
  id: 'wish-1',
  user_id: 'user-1',
  product_id: 'prod-1',
  product: mockProduct,
  created_at: '2024-01-01T00:00:00Z',
}

describe('WishlistPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows empty wishlist message', async () => {
    mockGetWishlist.mockResolvedValue([])
    render(<MemoryRouter><WishlistPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/wishlist is empty/i)).toBeInTheDocument())
  })

  it('renders wishlist items', async () => {
    mockGetWishlist.mockResolvedValue([mockWishlistItem])
    render(<MemoryRouter><WishlistPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Test Product')).toBeInTheDocument())
  })

  it('calls removeFromWishlist when Remove button clicked', async () => {
    mockRemoveFromWishlist.mockResolvedValue(undefined)
    mockGetWishlist.mockResolvedValue([mockWishlistItem])
    render(<MemoryRouter><WishlistPage /></MemoryRouter>)
    await waitFor(() => screen.getByRole('button', { name: /remove/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    await waitFor(() => expect(mockRemoveFromWishlist).toHaveBeenCalledWith('prod-1'))
  })

  it('shows error when getWishlist fails', async () => {
    mockGetWishlist.mockRejectedValue(new Error('Network error'))
    render(<MemoryRouter><WishlistPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })
})
