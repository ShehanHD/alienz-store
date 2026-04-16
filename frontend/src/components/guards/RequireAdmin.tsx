import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PageLoader } from '../ui/PageLoader'

export function RequireAdmin() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <PageLoader />
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) return <Navigate to="/" replace />
  return <Outlet />
}
