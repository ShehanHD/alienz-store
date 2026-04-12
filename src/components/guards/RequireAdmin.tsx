import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../ui/Spinner'

export function RequireAdmin() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <Spinner />
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) return <Navigate to="/" replace />
  return <Outlet />
}
