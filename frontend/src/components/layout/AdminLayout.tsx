import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, Package, Tag, Palette,
  MessageSquare, Users, Users2, Settings, ArrowLeft, Menu, X, Sliders,
} from 'lucide-react'
import styles from './AdminLayout.module.css'

const NAV = [
  { to: '/admin',              end: true,  icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/admin/products',                 icon: Package,         label: 'Products'       },
  { to: '/admin/categories',               icon: Tag,             label: 'Categories'     },
  { to: '/admin/collaborators',            icon: Users2,          label: 'Collaborators'  },
  { to: '/admin/colors-sizes',             icon: Palette,         label: 'Colors & Sizes' },
  { to: '/admin/attributes',               icon: Sliders,         label: 'Attributes'     },
  { to: '/admin/enquiries',                icon: MessageSquare,   label: 'Enquiries'      },
  { to: '/admin/clients',                  icon: Users,           label: 'Clients'        },
]

export function AdminLayout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? styles.active : undefined

  const handleNavClick = () => setSidebarOpen(false)

  return (
    <div className={styles.layout}>
      {/* Mobile top bar */}
      <div className={styles.mobileBar}>
        <button
          className={styles.menuBtn}
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
        </button>
        <span className={styles.mobileTitle}>Admin</span>
      </div>

      {/* Overlay */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarNav}>
          {NAV.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className={navClass} onClick={handleNavClick}>
              <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          {user?.role === 'owner' && (
            <NavLink to="/admin/settings" className={navClass} onClick={handleNavClick}>
              <Settings size={14} strokeWidth={1.5} aria-hidden="true" />
              Settings
            </NavLink>
          )}
        </div>
        <div className={styles.sidebarFooter}>
          <Link to="/shop" className={styles.backToShop} onClick={handleNavClick}>
            <ArrowLeft size={12} strokeWidth={1.5} aria-hidden="true" />
            Shop
          </Link>
        </div>
      </aside>

      <main className={styles.main}><Outlet /></main>
    </div>
  )
}
