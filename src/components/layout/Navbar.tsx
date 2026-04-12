import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './Navbar.module.css'

export function Navbar() {
  const { user, logout } = useAuth()
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <Link to="/" className={styles.brand}>AlienzStore</Link>
      <div className={styles.links}>
        <Link to="/shop">Shop</Link>
        <Link to="/contact">Contact</Link>
        {user ? (
          <>
            <Link to="/account">Account</Link>
            {(user.role === 'admin' || user.role === 'owner') && <Link to="/admin">Admin</Link>}
            <button onClick={() => void logout()} className={styles.logoutBtn}>Logout</button>
          </>
        ) : (
          <Link to="/auth/login">Login</Link>
        )}
      </div>
    </nav>
  )
}
