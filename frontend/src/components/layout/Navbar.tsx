import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { User, LogIn, LogOut, ShieldCheck, Menu, X } from 'lucide-react'
import { getCategories } from '../../api/categories'
import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../contexts/ConfirmContext'
import type { Category } from '../../types'
import styles from './Navbar.module.css'

export function Navbar() {
  const { user, logout } = useAuth()
  const confirm = useConfirm()
  const { pathname, search } = useLocation()
  const [categories, setCategories] = useState<Category[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    void getCategories().then((cats) => setCategories(cats.filter((c) => c.show_in_navbar))).catch(() => {})
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname, search])

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const categoryClass = (slug: string) => {
    const active = pathname === '/shop' && new URLSearchParams(search).get('category') === slug
    return active ? `${styles.link} ${styles.active}` : styles.link
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.link} ${styles.active}` : styles.link

  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.mobileLink} ${styles.active}` : styles.mobileLink

  const mobileCategoryClass = (slug: string) => {
    const active = pathname === '/shop' && new URLSearchParams(search).get('category') === slug
    return active ? `${styles.mobileLink} ${styles.active}` : styles.mobileLink
  }

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {/* Desktop layout */}
      <div className={styles.left}>
        {categories.map((c) => (
          <Link key={c.id} to={`/shop?category=${c.slug}`} className={categoryClass(c.slug)}>
            {c.name}
          </Link>
        ))}
      </div>

      <Link to="/" className={styles.brand}>Alienz Store</Link>

      <div className={styles.right}>
        {user ? (
          <>
            <NavLink to="/account" className={navClass} title="Account">
              <User size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Account</span>
            </NavLink>
            {(user.role === 'admin' || user.role === 'owner') && (
              <NavLink to="/admin" className={navClass} title="Admin">
                <ShieldCheck size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>Admin</span>
              </NavLink>
            )}
            <button onClick={() => void confirm('Log out of your account?', { title: 'Log Out', confirmLabel: 'Log Out' }).then((ok) => ok && logout())} className={styles.logoutBtn} title="Logout">
              <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <NavLink to="/auth/login" className={navClass} title="Login">
            <LogIn size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>Login</span>
          </NavLink>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        ref={triggerRef}
        className={styles.hamburger}
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div ref={menuRef} className={styles.mobileMenu} role="dialog" aria-label="Navigation menu">
          {categories.map((c) => (
            <Link key={c.id} to={`/shop?category=${c.slug}`} className={mobileCategoryClass(c.slug)}>
              {c.name}
            </Link>
          ))}
          {user ? (
            <>
              <NavLink to="/account" className={mobileNavClass}>
                <User size={14} strokeWidth={1.5} aria-hidden="true" />
                Account
              </NavLink>
              {(user.role === 'admin' || user.role === 'owner') && (
                <NavLink to="/admin" className={mobileNavClass}>
                  <ShieldCheck size={14} strokeWidth={1.5} aria-hidden="true" />
                  Admin
                </NavLink>
              )}
              <button onClick={() => void confirm('Log out of your account?', { title: 'Log Out', confirmLabel: 'Log Out' }).then((ok) => ok && logout())} className={`${styles.mobileLink} ${styles.mobileLinkBtn}`}>
                <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/auth/login" className={mobileNavClass}>
              <LogIn size={14} strokeWidth={1.5} aria-hidden="true" />
              Login
            </NavLink>
          )}
        </div>
      )}
    </nav>
  )
}
