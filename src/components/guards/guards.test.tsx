import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import type { Mock } from 'vitest'
import { RequireAuth } from './RequireAuth'
import { RequireAdmin } from './RequireAdmin'
import { RequireOwner } from './RequireOwner'
import { useAuth } from '../../hooks/useAuth'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = useAuth as Mock

function renderWithRouter(element: React.ReactNode, initialPath: string, guardPath: string, protectedContent: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/auth/login" element={<div>login page</div>} />
        <Route path="/" element={<div>home page</div>} />
        <Route path="/admin" element={<div>admin page</div>} />
        <Route element={element}>
          <Route path={guardPath} element={<div>{protectedContent}</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAuth', () => {
  it('redirects to /auth/login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false })
    renderWithRouter(<RequireAuth />, '/account', '/account', 'account page')
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('shows spinner while loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true })
    renderWithRouter(<RequireAuth />, '/account', '/account', 'account page')
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders child route when authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'client' }, isLoading: false })
    renderWithRouter(<RequireAuth />, '/account', '/account', 'account page')
    expect(screen.getByText('account page')).toBeInTheDocument()
  })
})

describe('RequireAdmin', () => {
  it('redirects to / when user has client role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'client' }, isLoading: false })
    renderWithRouter(<RequireAdmin />, '/admin/products', '/admin/products', 'admin products')
    expect(screen.getByText('home page')).toBeInTheDocument()
  })

  it('renders child route when user has admin role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' }, isLoading: false })
    renderWithRouter(<RequireAdmin />, '/admin/products', '/admin/products', 'admin products')
    expect(screen.getByText('admin products')).toBeInTheDocument()
  })

  it('renders child route when user has owner role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'owner' }, isLoading: false })
    renderWithRouter(<RequireAdmin />, '/admin/products', '/admin/products', 'admin products')
    expect(screen.getByText('admin products')).toBeInTheDocument()
  })
})

describe('RequireOwner', () => {
  it('redirects to /admin when user has admin role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' }, isLoading: false })
    renderWithRouter(<RequireOwner />, '/admin/settings', '/admin/settings', 'settings page')
    expect(screen.getByText('admin page')).toBeInTheDocument()
  })

  it('renders child route when user has owner role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'owner' }, isLoading: false })
    renderWithRouter(<RequireOwner />, '/admin/settings', '/admin/settings', 'settings page')
    expect(screen.getByText('settings page')).toBeInTheDocument()
  })
})
