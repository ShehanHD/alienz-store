import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import { ToastContainer } from './components/ui/Toast'
import { ConfirmDialog } from './components/ui/ConfirmDialog'
import { RequireAuth } from './components/guards/RequireAuth'
import { RequireAdmin } from './components/guards/RequireAdmin'
import { RequireOwner } from './components/guards/RequireOwner'
import { PublicLayout } from './components/layout/PublicLayout'
import { AdminLayout } from './components/layout/AdminLayout'
import { MaintenancePage } from './pages/public/MaintenancePage'
import { HomePage } from './pages/public/HomePage'
import { ShopPage } from './pages/public/ShopPage'
import { ProductDetailPage } from './pages/public/ProductDetailPage'
import { ContactPage } from './pages/public/ContactPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ConfirmEmailPage } from './pages/auth/ConfirmEmailPage'
import { AccountDashboardPage } from './pages/account/AccountDashboardPage'
import { OrdersPage } from './pages/account/OrdersPage'
import { WishlistPage } from './pages/account/WishlistPage'
import { ProfilePage } from './pages/account/ProfilePage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { ProductsPage } from './pages/admin/ProductsPage'
import { ProductFormPage } from './pages/admin/ProductFormPage'
import { CategoriesPage } from './pages/admin/CategoriesPage'
import { CollaboratorsAdminPage } from './pages/admin/CollaboratorsAdminPage'
import { EnquiriesPage } from './pages/admin/EnquiriesPage'
import { ClientsPage } from './pages/admin/ClientsPage'
import { SettingsPage } from './pages/admin/SettingsPage'
import { ColorsAndSizesPage } from './pages/admin/ColorsAndSizesPage'
import { AttributesPage } from './pages/admin/AttributesPage'

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/shop/:slug" element={<ProductDetailPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/register" element={<RegisterPage />} />
                <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
                <Route element={<RequireAuth />}>
                  <Route path="/account" element={<AccountDashboardPage />} />
                  <Route path="/account/orders" element={<OrdersPage />} />
                  <Route path="/account/wishlist" element={<WishlistPage />} />
                  <Route path="/account/profile" element={<ProfilePage />} />
                </Route>
              </Route>
              <Route element={<RequireAdmin />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/products" element={<ProductsPage />} />
                  <Route path="/admin/products/new" element={<ProductFormPage />} />
                  <Route path="/admin/products/:id" element={<ProductFormPage />} />
                  <Route path="/admin/categories" element={<CategoriesPage />} />
                  <Route path="/admin/collaborators" element={<CollaboratorsAdminPage />} />
                  <Route path="/admin/enquiries" element={<EnquiriesPage />} />
                  <Route path="/admin/clients" element={<ClientsPage />} />
                  <Route path="/admin/colors-sizes" element={<ColorsAndSizesPage />} />
                  <Route path="/admin/attributes" element={<AttributesPage />} />
                  <Route element={<RequireOwner />}>
                    <Route path="/admin/settings" element={<SettingsPage />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
          <ToastContainer />
          <ConfirmDialog />
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}
