import { Link } from 'react-router-dom'
import { Container, Stack } from '@shehandon/vcs-ui'
import { useAuth } from '../../hooks/useAuth'
import styles from './AccountDashboardPage.module.css'

export function AccountDashboardPage() {
  const { user } = useAuth()
  return (
    <Container size="md" padding="6">
      <h1 className={styles.title}>My Account</h1>
      <p className={styles.greeting}>Welcome, {user?.first_name}</p>
      <Stack as="nav" direction="column" gap="3">
        <Link className={styles.navLink} to="/account/orders">
          My Orders
        </Link>
        <Link className={styles.navLink} to="/account/wishlist">
          Wishlist
        </Link>
        <Link className={styles.navLink} to="/account/profile">
          Profile &amp; Address
        </Link>
      </Stack>
    </Container>
  )
}
