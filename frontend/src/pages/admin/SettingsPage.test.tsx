import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SettingsPage } from './SettingsPage'

const mockGetSiteConfig = vi.hoisted(() => vi.fn())
const mockUpdateSiteConfig = vi.hoisted(() => vi.fn())

vi.mock('../../api/admin', () => ({
  getSiteConfig: mockGetSiteConfig,
  updateSiteConfig: mockUpdateSiteConfig,
  getClients: vi.fn(),
  toggleClientActive: vi.fn(),
  promoteToAdmin: vi.fn(),
  getDashboard: vi.fn(),
  getAdminProducts: vi.fn(),
  deleteAdminProduct: vi.fn(),
}))

const mockConfig = [{ key: 'max_products', value: '15', updated_at: '' }]

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetSiteConfig.mockResolvedValue(mockConfig)
    mockUpdateSiteConfig.mockResolvedValue({ key: 'max_products', value: '20', updated_at: '' })
  })

  it('shows max_products config key with its current value', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByDisplayValue('15')).toBeInTheDocument())
    expect(screen.getByText('max_products')).toBeInTheDocument()
  })

  it('calls updateSiteConfig with the correct key and value when Save is clicked', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByDisplayValue('15')).toBeInTheDocument())

    const input = screen.getByDisplayValue('15')
    await user.clear(input)
    await user.type(input, '20')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() =>
      expect(mockUpdateSiteConfig).toHaveBeenCalledWith('max_products', '20')
    )
  })

  it('shows an error message when getSiteConfig fails', async () => {
    mockGetSiteConfig.mockRejectedValue(new Error('Network error'))
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    )
  })
})
