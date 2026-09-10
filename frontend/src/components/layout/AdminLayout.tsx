import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, Package, Tag, Palette,
  MessageSquare, Users, Users2, Settings, ArrowLeft, Sliders,
} from 'lucide-react'
import { AppShell, Sidebar, MobileMenu, Navbar as VcsNavbar, Stack, Box } from '@shehandon/vcs-ui'
import type { NavItem, RenderLink, SidebarGroupDef } from '@shehandon/vcs-ui'
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

const renderLink: RenderLink = (item, inner) => (
  <Link to={item.href ?? '#'} aria-disabled={item.disabled}>{inner}</Link>
)

export function AdminLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  const items: NavItem[] = NAV.map(({ to, end, icon: Icon, label }) => ({
    key: to,
    label,
    href: to,
    icon: <Icon size={14} strokeWidth={1.5} aria-hidden="true" />,
    active: end ? pathname === to : pathname.startsWith(to),
  }))
  if (user?.role === 'owner') {
    items.push({
      key: '/admin/settings',
      label: 'Settings',
      href: '/admin/settings',
      icon: <Settings size={14} strokeWidth={1.5} aria-hidden="true" />,
      active: pathname.startsWith('/admin/settings'),
    })
  }

  const groups: SidebarGroupDef[] = [{ key: 'main', items }]

  return (
    <AppShell
      collapseBelow="md"
      header={
        <Stack direction="row" align="center" gap="4" className={styles.mobileBar} data-mode="dark">
          <VcsNavbar.Toggle />
          <span className={styles.mobileTitle}>Admin</span>
        </Stack>
      }
      sidebar={
        <Stack direction="column" justify="between" className={styles.sidebar} data-mode="dark">
          <Sidebar groups={groups} renderLink={renderLink} className={styles.sidebarNav} />
          <Box px="8" pb="6" pt="4" className={styles.sidebarFooter}>
            <Link to="/" className={styles.backToShop}>
              <ArrowLeft size={12} strokeWidth={1.5} aria-hidden="true" />
              Shop
            </Link>
          </Box>
        </Stack>
      }
      mobileMenu={<MobileMenu items={items} renderLink={renderLink} title="Admin" />}
    >
      <Box className={styles.main}><Outlet /></Box>
    </AppShell>
  )
}
