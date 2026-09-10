import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { User, LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { Navbar as VcsNavbar, MobileMenu, Stack } from '@shehandon/vcs-ui'
import type { NavItem, RenderLink } from '@shehandon/vcs-ui'
import { getCategories } from '../../api/categories'
import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../contexts/ConfirmContext'
import type { Category } from '../../types'
import styles from './Navbar.module.css'

const renderLink: RenderLink = (item, inner) => (
  <Link to={item.href ?? '#'} aria-disabled={item.disabled}>{inner}</Link>
)

export function Navbar() {
  const { user, logout } = useAuth()
  const confirm = useConfirm()
  const { pathname, search } = useLocation()
  const [categories, setCategories] = useState<Category[]>([])
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    void getCategories().then((cats) => setCategories(cats.filter((c) => c.show_in_navbar))).catch(() => {})
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname, search])

  const isCategoryActive = (slug: string) =>
    pathname === '/shop' && new URLSearchParams(search).get('category') === slug

  const categoryItems: NavItem[] = categories.map((c) => ({
    key: c.id,
    label: c.name,
    href: `/shop?category=${c.slug}`,
    active: isCategoryActive(c.slug),
  }))

  const handleLogout = () => {
    void confirm('Log out of your account?', { title: 'Log Out', confirmLabel: 'Log Out' })
      .then((ok) => { if (ok) void logout() })
  }

  return (
    <VcsNavbar sticky bordered className={styles.navWrap}>
      <span className={styles.desktopOnly}>
        <VcsNavbar.Nav items={categoryItems} renderLink={renderLink} />
      </span>

      <VcsNavbar.Brand>
        <Link to="/" className={styles.brandLink}>
          <img src="/logo.png" alt="The Alienz" className={styles.logo} />
        </Link>
      </VcsNavbar.Brand>

      <VcsNavbar.Actions>
        <span className={styles.desktopOnly}>
          {user ? (
            <>
              <VcsNavbar.Link asChild active={pathname === '/account'}>
                <Link to="/account" title="Account">
                  <Stack as="span" direction="row" align="center" gap="1">
                    <User size={14} strokeWidth={1.5} aria-hidden="true" />
                    <span>Account</span>
                  </Stack>
                </Link>
              </VcsNavbar.Link>
              {(user.role === 'admin' || user.role === 'owner') && (
                <VcsNavbar.Link asChild active={pathname.startsWith('/admin')}>
                  <Link to="/admin" title="Admin">
                    <Stack as="span" direction="row" align="center" gap="1">
                      <ShieldCheck size={14} strokeWidth={1.5} aria-hidden="true" />
                      <span>Admin</span>
                    </Stack>
                  </Link>
                </VcsNavbar.Link>
              )}
              <VcsNavbar.Link onClick={handleLogout} title="Logout">
                <Stack as="span" direction="row" align="center" gap="1">
                  <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
                  <span>Logout</span>
                </Stack>
              </VcsNavbar.Link>
            </>
          ) : (
            <VcsNavbar.Link asChild active={pathname === '/auth/login'}>
              <Link to="/auth/login" title="Login">
                <Stack as="span" direction="row" align="center" gap="1">
                  <LogIn size={14} strokeWidth={1.5} aria-hidden="true" />
                  <span>Login</span>
                </Stack>
              </Link>
            </VcsNavbar.Link>
          )}
        </span>

        <VcsNavbar.Toggle onMenuClick={() => setMenuOpen((v) => !v)} />
      </VcsNavbar.Actions>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        {categories.map((c) => (
          <VcsNavbar.Link key={c.id} asChild active={isCategoryActive(c.slug)}>
            <Link to={`/shop?category=${c.slug}`}>{c.name}</Link>
          </VcsNavbar.Link>
        ))}
        {user ? (
          <>
            <VcsNavbar.Link asChild active={pathname === '/account'}>
              <Link to="/account">
                <Stack as="span" direction="row" align="center" gap="2">
                  <User size={14} strokeWidth={1.5} aria-hidden="true" />
                  Account
                </Stack>
              </Link>
            </VcsNavbar.Link>
            {(user.role === 'admin' || user.role === 'owner') && (
              <VcsNavbar.Link asChild active={pathname.startsWith('/admin')}>
                <Link to="/admin">
                  <Stack as="span" direction="row" align="center" gap="2">
                    <ShieldCheck size={14} strokeWidth={1.5} aria-hidden="true" />
                    Admin
                  </Stack>
                </Link>
              </VcsNavbar.Link>
            )}
            <VcsNavbar.Link onClick={handleLogout}>
              <Stack as="span" direction="row" align="center" gap="2">
                <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
                Logout
              </Stack>
            </VcsNavbar.Link>
          </>
        ) : (
          <VcsNavbar.Link asChild active={pathname === '/auth/login'}>
            <Link to="/auth/login">
              <Stack as="span" direction="row" align="center" gap="2">
                <LogIn size={14} strokeWidth={1.5} aria-hidden="true" />
                Login
              </Stack>
            </Link>
          </VcsNavbar.Link>
        )}
      </MobileMenu>
    </VcsNavbar>
  )
}
