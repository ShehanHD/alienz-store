import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConfirmEmailPage } from './ConfirmEmailPage'

function makeAxiosError(message: string, status: number): Error {
  return Object.assign(new Error(message), { isAxiosError: true, response: { status } })
}

const mockConfirmEmail = vi.hoisted(() => vi.fn())
const mockResendConfirmation = vi.hoisted(() => vi.fn())

vi.mock('../../api/auth', () => ({
  confirmEmail: mockConfirmEmail,
  resendConfirmation: mockResendConfirmation,
}))

function renderWithToken(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/confirm-email?token=${token}`]}>
      <Routes>
        <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ConfirmEmailPage', () => {
  beforeEach(() => {
    mockConfirmEmail.mockReset()
    mockResendConfirmation.mockReset()
  })

  it('shows success message on valid token', async () => {
    mockConfirmEmail.mockResolvedValue({ detail: 'Email confirmed. You can now log in.' })
    renderWithToken('validtoken123')
    await waitFor(() => expect(screen.getByText(/email confirmed/i)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows expired message on 410 response', async () => {
    const err = makeAxiosError('Gone', 410)
    mockConfirmEmail.mockRejectedValue(err)
    renderWithToken('expiredtoken')
    await waitFor(() => expect(screen.getByText(/link has expired/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument()
  })

  it('shows invalid message on 400 response', async () => {
    const err = makeAxiosError('Bad Request', 400)
    mockConfirmEmail.mockRejectedValue(err)
    renderWithToken('badtoken')
    await waitFor(() => expect(screen.getByText(/invalid.*link/i)).toBeInTheDocument())
  })

  it('resend sends the confirmation and shows success', async () => {
    const err = makeAxiosError('Gone', 410)
    mockConfirmEmail.mockRejectedValue(err)
    mockResendConfirmation.mockResolvedValue({ detail: 'If that account exists...' })
    renderWithToken('expiredtoken')
    await waitFor(() => expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /resend/i }))
    await waitFor(() => expect(mockResendConfirmation).toHaveBeenCalledWith('user@example.com'))
    await waitFor(() => expect(screen.getByText(/new link sent/i)).toBeInTheDocument())
  })

  it('shows error message when resend fails', async () => {
    const expiredErr = makeAxiosError('Gone', 410)
    mockConfirmEmail.mockRejectedValue(expiredErr)
    mockResendConfirmation.mockRejectedValue(new Error('Network error'))
    renderWithToken('expiredtoken')
    await waitFor(() => expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /resend/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })
})
