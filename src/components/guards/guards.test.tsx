import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { RequireAuth } from './RequireAuth'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ user: null, isLoading: false }),
}))

it('redirects to /auth/login when not authenticated', () => {
  render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route path="/auth/login" element={<div>login page</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/account" element={<div>account</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
  expect(screen.getByText('login page')).toBeInTheDocument()
})
