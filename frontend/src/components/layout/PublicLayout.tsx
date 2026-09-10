import { Outlet } from 'react-router-dom'
import { Stack, Box } from '@shehandon/vcs-ui'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function PublicLayout() {
  return (
    <Stack direction="column" gap="0" style={{ minHeight: '100dvh' }}>
      <Navbar />
      <Box as="main" style={{ flex: 1 }}>
        <Outlet />
      </Box>
      <Footer />
    </Stack>
  )
}
