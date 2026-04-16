import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PageLoader } from '../ui/PageLoader'

export function RequireAuth() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <PageLoader />
  if (!user) return <Navigate to="/auth/login" state={{ from: location }} replace />
  return <Outlet />
}
