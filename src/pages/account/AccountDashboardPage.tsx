import { Link } from 'react-router-dom'
import styles from './AccountDashboardPage.module.css'

export function AccountDashboardPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Account</h1>
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
