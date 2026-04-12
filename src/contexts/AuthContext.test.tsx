import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuthContext } from './AuthContext'

// Mock API modules
vi.mock('../api/auth', () => ({
  refreshToken: vi.fn().mockResolvedValue(null),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
  forgotPassword: vi.fn(),
}))

vi.mock('../api/client', () => ({
  initApiClient: vi.fn().mockReturnValue({}),
  getApiClient: vi.fn().mockReturnValue({ post: vi.fn(), get: vi.fn() }),
}))

function TestConsumer() {
  const { user, isLoading } = useAuthContext()
  if (isLoading) return <div>loading</div>
  return <div>{user ? `user:${user.email}` : 'no-user'}</div>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children and shows no-user when refresh returns null', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
    expect(screen.getByText('no-user')).toBeTruthy()
  })
})
