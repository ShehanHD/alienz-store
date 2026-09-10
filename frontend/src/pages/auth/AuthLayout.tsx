import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Grid, Box, Stack } from '@shehandon/vcs-ui'
import styles from './AuthLayout.module.css'

interface Props {
  readonly children: ReactNode
  /** Sub-line shown under the brand headline (defaults to the sign-in copy). */
  readonly brandSubtitle?: string
}

/** Shared split-screen shell for the auth pages: brand/imagery panel on the
 *  left, form panel on the right. Collapses to a single column below md. */
export function AuthLayout({ children, brandSubtitle }: Props) {
  return (
    <Grid columns={{ base: 1, md: 2 }} gap="0" className={styles.split}>
      {/* Brand panel — imagery + wordmark */}
      <Box className={styles.brand} data-mode="dark">
        <Stack direction="column" justify="between" className={styles.brandInner}>
          <Link to="/" className={styles.wordmark}>The Alienz</Link>
          <div>
            <h2 className={styles.brandHeadline}>Curated luxury<br />for the discerning few.</h2>
            <p className={styles.brandSub}>
              {brandSubtitle ?? 'Sign in to access your account, orders and wishlist.'}
            </p>
          </div>
          <span className={styles.brandFoot}>© {new Date().getFullYear()} The Alienz</span>
        </Stack>
      </Box>

      {/* Form panel */}
      <Box className={styles.formPanel}>
        <Stack direction="column" gap="6" className={styles.formInner}>
          <Stack direction="row" align="center" justify="between" gap="4">
            <Link to="/" className={styles.mobileWordmark}>The Alienz</Link>
            <Link to="/" className={styles.backToStore}>
              <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
              Back to store
            </Link>
          </Stack>
          {children}
        </Stack>
      </Box>
    </Grid>
  )
}
