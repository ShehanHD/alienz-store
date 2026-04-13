import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './AccountDashboardPage.module.css'

export function AccountDashboardPage() {
  const { user } = useAuth()
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Account</h1>
      <p className={styles.greeting}>Welcome, {user?.first_name}</p>
      <nav className={styles.nav}>
        <Link className={styles.navLink} to="/account/orders">
          My Orders
        </Link>
        <Link className={styles.navLink} to="/account/wishlist">
          Wishlist
        </Link>
        <Link className={styles.navLink} to="/account/profile">
          Profile &amp; Address
        </Link>
      </nav>
    </div>
  )
}
