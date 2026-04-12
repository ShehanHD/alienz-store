import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { LoginPage } from './LoginPage'

const mockLogin = vi.hoisted(() => vi.fn())
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ login: mockLogin, user: null }),
}))

describe('LoginPage', () => {

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

it('shows error message when login fails', async () => {
  mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'))
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } })
  fireEvent.click(screen.getByRole('button', { name: /login/i }))
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
})

})
