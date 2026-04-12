import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { WishlistPage } from './WishlistPage'

vi.mock('../../api/wishlist', () => ({
  getWishlist: vi.fn().mockResolvedValue([]),
  removeFromWishlist: vi.fn(),
}))

it('shows empty wishlist message', async () => {
  render(
    <MemoryRouter>
      <WishlistPage />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByText(/wishlist is empty/i)).toBeInTheDocument())
})
