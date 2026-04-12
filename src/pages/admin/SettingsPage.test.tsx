import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { SettingsPage } from './SettingsPage'

vi.mock('../../api/admin', () => ({
  getSiteConfig: vi.fn().mockResolvedValue([
    { key: 'max_products', value: '15', updated_at: '' },
  ]),
  updateSiteConfig: vi.fn(),
}))

it('shows max_products config key', async () => {
  render(<MemoryRouter><SettingsPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByDisplayValue('15')).toBeInTheDocument())
})
