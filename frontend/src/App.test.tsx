import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

vi.mock('./api/auth', () => ({
  refreshToken: vi.fn().mockResolvedValue(null),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
}))

vi.mock('./api/products', () => ({
  getProducts: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 4 }),
  getProduct: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // Just check it renders something
    expect(document.body).toBeTruthy()
  })
})
