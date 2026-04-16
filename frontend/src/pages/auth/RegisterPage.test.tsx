import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegisterPage } from './RegisterPage'

const mockRegister = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ register: mockRegister, user: null }),
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    mockRegister.mockReset()
  })

  it('shows check-email message after successful registration', async () => {
    mockRegister.mockResolvedValue({ detail: 'Check your email to confirm your account' })
    const user = userEvent.setup()
    render(<MemoryRouter><RegisterPage /></MemoryRouter>)
    await user.type(screen.getByLabelText(/first name/i), 'Alice')
    await user.type(screen.getByLabelText(/last name/i), 'Smith')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/phone/i), '555-0100')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument())
    expect(screen.getByText(/alice@example\.com/)).toBeInTheDocument()
  })

  it('shows error message when register fails', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Email taken'))
    const user = userEvent.setup()
    render(<MemoryRouter><RegisterPage /></MemoryRouter>)
    await user.type(screen.getByLabelText(/first name/i), 'Alice')
    await user.type(screen.getByLabelText(/last name/i), 'Smith')
    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/phone/i), '555-0100')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('disables the submit button while loading', async () => {
    let resolve!: (v: { detail: string }) => void
    mockRegister.mockImplementation(() => new Promise(r => { resolve = r }))
    const user = userEvent.setup()
    render(<MemoryRouter><RegisterPage /></MemoryRouter>)
    await user.type(screen.getByLabelText(/first name/i), 'Alice')
    await user.type(screen.getByLabelText(/last name/i), 'Smith')
    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/phone/i), '555-0100')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    const button = screen.getByRole('button', { name: /create account/i })
    await user.click(button)
    expect(button).toBeDisabled()
    resolve({ detail: 'ok' })
  })
})
