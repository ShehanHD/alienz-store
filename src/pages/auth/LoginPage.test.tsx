import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { LoginPage } from './LoginPage'

const mockLogin = vi.hoisted(() => vi.fn())
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ login: mockLogin, user: null }),
}))

it('calls login with email and password', async () => {
  mockLogin.mockResolvedValue(undefined)
  render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>
  )
  await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'secret')
  await userEvent.click(screen.getByRole('button', { name: /login/i }))
  expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'secret')
})
