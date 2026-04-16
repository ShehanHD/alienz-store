import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    render(<MemoryRouter><RegisterPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Smith' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-0100' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument())
    expect(screen.getByText(/alice@example\.com/)).toBeInTheDocument()
  })

  it('shows error message when register fails', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Email taken'))
    render(<MemoryRouter><RegisterPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } })
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form')!)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })
})
