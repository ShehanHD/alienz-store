import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../ui/Spinner'

export function RequireOwner() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <Spinner />
  if (!user || user.role !== 'owner') return <Navigate to="/admin" replace />
  return <Outlet />
}
