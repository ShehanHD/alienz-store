import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './AdminLayout.module.css'

export function AdminLayout() {
  const { user } = useAuth()
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <NavLink to="/admin">Dashboard</NavLink>
        <NavLink to="/admin/products">Products</NavLink>
        <NavLink to="/admin/categories">Categories</NavLink>
        <NavLink to="/admin/enquiries">Enquiries</NavLink>
        <NavLink to="/admin/clients">Clients</NavLink>
        {user?.role === 'owner' && <NavLink to="/admin/settings">Settings</NavLink>}
      </aside>
      <main className={styles.main}><Outlet /></main>
    </div>
  )
}
