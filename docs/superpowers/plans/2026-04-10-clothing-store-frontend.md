# Clothing Store Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React + Vite + TypeScript frontend for the clothing store — public shop, client account area, and admin panel.

**Architecture:** React Router v6 SPA with role-based route guards. Auth state lives in memory (not localStorage) — access token in React context, refresh token in httpOnly cookie. All API data validated with Zod at the boundary.

**Tech Stack:** React 18, Vite, TypeScript (strict), React Router v6, Axios, Zod, CSS Modules, Vitest, React Testing Library

---

## File Map

```
src/
├── main.tsx
├── App.tsx                          ← router + AuthProvider
├── api/
│   ├── client.ts                    ← axios instance + interceptors
│   ├── auth.ts
│   ├── products.ts
│   ├── categories.ts
│   ├── enquiries.ts
│   ├── wishlist.ts
│   ├── account.ts
│   ├── admin.ts
│   └── schemas/
│       ├── auth.ts
│       ├── products.ts
│       ├── categories.ts
│       ├── enquiries.ts
│       ├── wishlist.ts
│       ├── account.ts
│       └── admin.ts
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useSiteConfig.ts
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── AdminLayout.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Spinner.tsx
│   │   ├── ProductCard.tsx
│   │   └── ImageGallery.tsx
│   └── guards/
│       ├── RequireAuth.tsx
│       ├── RequireAdmin.tsx
│       └── RequireOwner.tsx
├── pages/
│   ├── public/
│   │   ├── HomePage.tsx
│   │   ├── ShopPage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── ContactPage.tsx
│   │   └── MaintenancePage.tsx
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── ForgotPasswordPage.tsx
│   ├── account/
│   │   ├── AccountDashboardPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── WishlistPage.tsx
│   │   └── ProfilePage.tsx
│   └── admin/
│       ├── AdminDashboardPage.tsx
│       ├── ProductsPage.tsx
│       ├── ProductFormPage.tsx
│       ├── CategoriesPage.tsx
│       ├── EnquiriesPage.tsx
│       ├── ClientsPage.tsx
│       └── SettingsPage.tsx
├── types/
│   └── index.ts
└── styles/
    ├── global.css
    └── variables.css
```

---

### Task 1: Scaffold Vite project + tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`
- Create: `src/main.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1: Scaffold**

```bash
npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom axios zod
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 4: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create `.env` and `.env.example`**

```
VITE_API_URL=http://localhost:8000
```

- [ ] **Step 6: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run"
}
```

- [ ] **Step 7: Run tests to confirm setup works**

```bash
npm run test:run
```
Expected: 0 tests, no errors.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: scaffold Vite + React + TypeScript project with Vitest"
```

---

### Task 2: TypeScript types

**Files:**
- Create: `src/types/index.ts`
- Test: `src/types/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/types/index.test.ts
import type { User, Product, Category, Enquiry, WishlistItem, SiteConfig, PaginatedResponse } from './index'

it('types compile', () => {
  const u: User = { id: 'x', email: 'a@b.com', role: 'client', first_name: 'A', last_name: 'B', is_active: true, created_at: '' }
  const p: PaginatedResponse<User> = { items: [u], total: 1, page: 1, page_size: 20 }
  expect(u.role).toBe('client')
  expect(p.total).toBe(1)
})
```

- [ ] **Step 2: Run test — expect compile error**

```bash
npm run test:run -- src/types/index.test.ts
```

- [ ] **Step 3: Create `src/types/index.ts`**

```ts
export type Role = 'client' | 'admin' | 'owner'
export type EnquiryStatus = 'new' | 'read' | 'replied'

export interface User {
  id: string
  email: string
  role: Role
  first_name: string
  last_name: string
  is_active: boolean
  created_at: string
}

export interface Address {
  id: string
  user_id: string
  street: string
  city: string
  country: string
  postal_code: string
  is_default: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  thumbnail_url: string
  is_primary: boolean
  sort_order: number
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  category_id: string
  category?: Category
  sizes: string[]
  colors: string[]
  is_active: boolean
  images: ProductImage[]
  created_at: string
  updated_at: string
}

export interface WishlistItem {
  id: string
  user_id: string
  product_id: string
  product?: Product
  created_at: string
}

export interface Enquiry {
  id: string
  user_id: string | null
  product_id: string | null
  name: string
  email: string
  message: string
  status: EnquiryStatus
  created_at: string
}

export interface SiteConfig {
  key: string
  value: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test:run -- src/types/index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/types/index.test.ts
git commit -m "feat: add TypeScript types"
```

---

### Task 3: Zod schemas

**Files:**
- Create: `src/api/schemas/auth.ts`, `src/api/schemas/products.ts`, `src/api/schemas/categories.ts`, `src/api/schemas/enquiries.ts`, `src/api/schemas/wishlist.ts`, `src/api/schemas/account.ts`, `src/api/schemas/admin.ts`
- Test: `src/api/schemas/schemas.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/api/schemas/schemas.test.ts
import { UserSchema, ProductSchema, CategorySchema } from './auth'
import { ProductSchema as PS } from './products'
import { CategorySchema as CS } from './categories'

it('UserSchema parses valid user', () => {
  const result = UserSchema.safeParse({
    id: 'abc', email: 'a@b.com', role: 'client',
    first_name: 'A', last_name: 'B', is_active: true, created_at: '2024-01-01'
  })
  expect(result.success).toBe(true)
})

it('UserSchema rejects invalid role', () => {
  const result = UserSchema.safeParse({ id: 'x', email: 'a@b.com', role: 'superuser' })
  expect(result.success).toBe(false)
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm run test:run -- src/api/schemas/schemas.test.ts
```

- [ ] **Step 3: Create `src/api/schemas/auth.ts`**

```ts
import { z } from 'zod'

export const RoleSchema = z.enum(['client', 'admin', 'owner'])

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: RoleSchema,
  first_name: z.string(),
  last_name: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
})

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('bearer'),
})

export const AuthUserSchema = z.object({
  user: UserSchema,
  access_token: z.string(),
})
```

- [ ] **Step 4: Create `src/api/schemas/products.ts`**

```ts
import { z } from 'zod'

export const ProductImageSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  url: z.string().url(),
  thumbnail_url: z.string().url(),
  is_primary: z.boolean(),
  sort_order: z.number().int(),
})

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  price: z.number(),
  category_id: z.string().uuid(),
  sizes: z.array(z.string()),
  colors: z.array(z.string()),
  is_active: z.boolean(),
  images: z.array(ProductImageSchema),
  created_at: z.string(),
  updated_at: z.string(),
})

export const PaginatedProductsSchema = z.object({
  items: z.array(ProductSchema),
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
})
```

- [ ] **Step 5: Create `src/api/schemas/categories.ts`**

```ts
import { z } from 'zod'

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  sort_order: z.number().int(),
})

export const CategoriesListSchema = z.array(CategorySchema)
```

- [ ] **Step 6: Create `src/api/schemas/enquiries.ts`**

```ts
import { z } from 'zod'

export const EnquiryStatusSchema = z.enum(['new', 'read', 'replied'])

export const EnquirySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  product_id: z.string().uuid().nullable(),
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
  status: EnquiryStatusSchema,
  created_at: z.string(),
})

export const PaginatedEnquiriesSchema = z.object({
  items: z.array(EnquirySchema),
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
})
```

- [ ] **Step 7: Create `src/api/schemas/wishlist.ts`**

```ts
import { z } from 'zod'
import { ProductSchema } from './products'

export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  product_id: z.string().uuid(),
  product: ProductSchema.optional(),
  created_at: z.string(),
})

export const WishlistSchema = z.array(WishlistItemSchema)
```

- [ ] **Step 8: Create `src/api/schemas/account.ts`**

```ts
import { z } from 'zod'

export const AddressSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  street: z.string(),
  city: z.string(),
  country: z.string(),
  postal_code: z.string(),
  is_default: z.boolean(),
})
```

- [ ] **Step 9: Create `src/api/schemas/admin.ts`**

```ts
import { z } from 'zod'
import { UserSchema } from './auth'

export const SiteConfigSchema = z.object({
  key: z.string(),
  value: z.string(),
  updated_at: z.string(),
})

export const SiteConfigsSchema = z.array(SiteConfigSchema)

export const AdminDashboardSchema = z.object({
  product_count: z.number().int(),
  enquiry_count: z.number().int(),
  storage_used_mb: z.number(),
  storage_quota_mb: z.number(),
  new_enquiries: z.number().int(),
})

export const PaginatedUsersSchema = z.object({
  items: z.array(UserSchema),
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
})
```

- [ ] **Step 10: Run tests — expect PASS**

```bash
npm run test:run -- src/api/schemas/schemas.test.ts
```

- [ ] **Step 11: Commit**

```bash
git add src/api/schemas/
git commit -m "feat: add Zod schemas for all API response types"
```

---

### Task 4: Axios API client with JWT interceptors

**Files:**
- Create: `src/api/client.ts`
- Test: `src/api/client.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/api/client.test.ts
import { createApiClient } from './client'
import { vi } from 'vitest'

it('injects Authorization header when token provided', async () => {
  const client = createApiClient(() => 'test-token')
  // Interceptor runs on request config — inspect the config directly
  const config = await client.interceptors.request['handlers'][0].fulfilled({
    headers: {} as any,
    url: '/test',
    method: 'get',
  } as any)
  expect(config.headers?.Authorization).toBe('Bearer test-token')
})

it('omits Authorization header when no token', async () => {
  const client = createApiClient(() => null)
  const config = await client.interceptors.request['handlers'][0].fulfilled({
    headers: {} as any,
  } as any)
  expect(config.headers?.Authorization).toBeUndefined()
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm run test:run -- src/api/client.test.ts
```

- [ ] **Step 3: Create `src/api/client.ts`**

```ts
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

let _refresh: (() => Promise<string | null>) | null = null
let _getToken: (() => string | null) | null = null

export function createApiClient(getToken: () => string | null): AxiosInstance {
  _getToken = getToken
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
    withCredentials: true, // send httpOnly cookie for refresh token
  })

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  return instance
}

// Singleton client — wired up in AuthContext after mount
let apiClient: AxiosInstance | null = null

export function getApiClient(): AxiosInstance {
  if (!apiClient) throw new Error('API client not initialised')
  return apiClient
}

export function initApiClient(
  getToken: () => string | null,
  refresh: () => Promise<string | null>
): AxiosInstance {
  _refresh = refresh
  apiClient = createApiClient(getToken)

  apiClient.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config
      if (error.response?.status === 401 && !original._retry && _refresh) {
        original._retry = true
        const newToken = await _refresh()
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`
          return apiClient!.request(original)
        }
      }
      return Promise.reject(error)
    }
  )

  return apiClient
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test:run -- src/api/client.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/api/client.ts src/api/client.test.ts
git commit -m "feat: add Axios API client with JWT Bearer + 401 refresh interceptors"
```

---

### Task 5: Auth API module + AuthContext + useAuth

**Files:**
- Create: `src/api/auth.ts`
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/hooks/useAuth.ts`
- Test: `src/contexts/AuthContext.test.tsx`

- [ ] **Step 1: Create `src/api/auth.ts`**

```ts
import { getApiClient } from './client'
import { AuthUserSchema, UserSchema } from './schemas/auth'
import type { User } from '../types'

export async function login(email: string, password: string): Promise<{ user: User; access_token: string }> {
  const res = await getApiClient().post('/auth/login', { email, password })
  return AuthUserSchema.parse(res.data)
}

export async function register(data: { email: string; password: string; first_name: string; last_name: string }): Promise<{ user: User; access_token: string }> {
  const res = await getApiClient().post('/auth/register', data)
  return AuthUserSchema.parse(res.data)
}

export async function logout(): Promise<void> {
  await getApiClient().post('/auth/logout')
}

export async function refreshToken(): Promise<{ access_token: string } | null> {
  try {
    const res = await getApiClient().post('/auth/refresh')
    return { access_token: res.data.access_token as string }
  } catch {
    return null
  }
}

export async function getMe(): Promise<User> {
  const res = await getApiClient().get('/auth/me')
  return UserSchema.parse(res.data)
}
```

- [ ] **Step 2: Write failing test**

```tsx
// src/contexts/AuthContext.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuthContext } from './AuthContext'
import { vi } from 'vitest'

vi.mock('../api/auth', () => ({
  refreshToken: vi.fn().mockResolvedValue(null),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))

function Consumer() {
  const { user, isLoading } = useAuthContext()
  if (isLoading) return <div>loading</div>
  return <div>{user ? user.email : 'no user'}</div>
}

it('renders no user when refresh returns null', async () => {
  render(<AuthProvider><Consumer /></AuthProvider>)
  expect(screen.getByText('loading')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('no user')).toBeInTheDocument())
})
```

- [ ] **Step 3: Run test — expect fail**

```bash
npm run test:run -- src/contexts/AuthContext.test.tsx
```

- [ ] **Step 4: Create `src/contexts/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { initApiClient } from '../api/client'
import { login as apiLogin, logout as apiLogout, register as apiRegister, refreshToken } from '../api/auth'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; first_name: string; last_name: string }) => Promise<void>
  logout: () => Promise<void>
  setAccessToken: (token: string | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const tokenRef = useRef<string | null>(null)

  // Keep ref in sync for the interceptor closure
  useEffect(() => { tokenRef.current = accessToken }, [accessToken])

  const doRefresh = async (): Promise<string | null> => {
    const result = await refreshToken()
    if (result) {
      setAccessToken(result.access_token)
      tokenRef.current = result.access_token
      return result.access_token
    }
    setAccessToken(null)
    setUser(null)
    return null
  }

  useEffect(() => {
    initApiClient(() => tokenRef.current, doRefresh)
    doRefresh().finally(() => setIsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password)
    setAccessToken(data.access_token)
    tokenRef.current = data.access_token
    setUser(data.user)
  }

  const register = async (data: { email: string; password: string; first_name: string; last_name: string }) => {
    const result = await apiRegister(data)
    setAccessToken(result.access_token)
    tokenRef.current = result.access_token
    setUser(result.user)
  }

  const logout = async () => {
    await apiLogout()
    setAccessToken(null)
    tokenRef.current = null
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 5: Create `src/hooks/useAuth.ts`**

```ts
import { useAuthContext } from '../contexts/AuthContext'

export function useAuth() {
  return useAuthContext()
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npm run test:run -- src/contexts/AuthContext.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/api/auth.ts src/contexts/AuthContext.tsx src/hooks/useAuth.ts src/contexts/AuthContext.test.tsx
git commit -m "feat: add auth API module, AuthContext with refresh-on-mount, useAuth hook"
```

---

### Task 6: React Router v6 routing + route guards + App.tsx

**Files:**
- Create: `src/components/guards/RequireAuth.tsx`, `RequireAdmin.tsx`, `RequireOwner.tsx`
- Create: `src/App.tsx`, `src/main.tsx`
- Test: `src/components/guards/guards.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/guards/guards.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { RequireAuth } from './RequireAuth'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ user: null, isLoading: false }),
}))

it('redirects to /auth/login when not authenticated', () => {
  render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route path="/auth/login" element={<div>login page</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/account" element={<div>account</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
  expect(screen.getByText('login page')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm run test:run -- src/components/guards/guards.test.tsx
```

- [ ] **Step 3: Create guards**

```tsx
// src/components/guards/RequireAuth.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../ui/Spinner'

export function RequireAuth() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <Spinner />
  if (!user) return <Navigate to="/auth/login" state={{ from: location }} replace />
  return <Outlet />
}
```

```tsx
// src/components/guards/RequireAdmin.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../ui/Spinner'

export function RequireAdmin() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <Spinner />
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) return <Navigate to="/" replace />
  return <Outlet />
}
```

```tsx
// src/components/guards/RequireOwner.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../ui/Spinner'

export function RequireOwner() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <Spinner />
  if (!user || user.role !== 'owner') return <Navigate to="/admin" replace />
  return <Outlet />
}
```

- [ ] **Step 4: Create `src/App.tsx`**

```tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { RequireAuth } from './components/guards/RequireAuth'
import { RequireAdmin } from './components/guards/RequireAdmin'
import { RequireOwner } from './components/guards/RequireOwner'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { AdminLayout } from './components/layout/AdminLayout'
import { MaintenancePage } from './pages/public/MaintenancePage'
import { HomePage } from './pages/public/HomePage'
import { ShopPage } from './pages/public/ShopPage'
import { ProductDetailPage } from './pages/public/ProductDetailPage'
import { ContactPage } from './pages/public/ContactPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { AccountDashboardPage } from './pages/account/AccountDashboardPage'
import { OrdersPage } from './pages/account/OrdersPage'
import { WishlistPage } from './pages/account/WishlistPage'
import { ProfilePage } from './pages/account/ProfilePage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { ProductsPage } from './pages/admin/ProductsPage'
import { ProductFormPage } from './pages/admin/ProductFormPage'
import { CategoriesPage } from './pages/admin/CategoriesPage'
import { EnquiriesPage } from './pages/admin/EnquiriesPage'
import { ClientsPage } from './pages/admin/ClientsPage'
import { SettingsPage } from './pages/admin/SettingsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route element={<><Navbar /><Footer /></>}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:slug" element={<ProductDetailPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
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
              <Route path="/admin/enquiries" element={<EnquiriesPage />} />
              <Route path="/admin/clients" element={<ClientsPage />} />
              <Route element={<RequireOwner />}>
                <Route path="/admin/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

- [ ] **Step 5: Create `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npm run test:run -- src/components/guards/guards.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/guards/ src/App.tsx src/main.tsx
git commit -m "feat: add route guards and full React Router v6 routing"
```

---

### Task 7: Global styles + shared UI components + layout

**Files:**
- Create: `src/styles/global.css`, `src/styles/variables.css`
- Create: `src/components/ui/Button.tsx`, `Input.tsx`, `Spinner.tsx`, `ProductCard.tsx`, `ImageGallery.tsx`
- Create: `src/components/layout/Navbar.tsx`, `Footer.tsx`, `AdminLayout.tsx`
- Test: `src/components/ui/Button.test.tsx`

- [ ] **Step 1: Create `src/styles/variables.css`**

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f8f6;
  --bg-card: #ffffff;
  --text-primary: #1a1a1a;
  --text-secondary: #6b6b6b;
  --accent: #2c2c2c;
  --accent-hover: #444444;
  --border: #e5e5e5;
  --error: #c0392b;
  --success: #27ae60;
  --radius: 6px;
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

- [ ] **Step 2: Create `src/styles/global.css`**

```css
@import './variables.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-sans); color: var(--text-primary); background: var(--bg-primary); line-height: 1.5; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
```

- [ ] **Step 3: Write failing test for Button**

```tsx
// src/components/ui/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

it('renders with label and calls onClick', async () => {
  const onClick = vi.fn()
  render(<Button onClick={onClick}>Save</Button>)
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onClick).toHaveBeenCalledOnce()
})

it('is disabled and shows loading state', () => {
  render(<Button loading>Save</Button>)
  expect(screen.getByRole('button')).toBeDisabled()
})
```

- [ ] **Step 4: Run test — expect fail**

```bash
npm run test:run -- src/components/ui/Button.test.tsx
```

- [ ] **Step 5: Create UI components**

```tsx
// src/components/ui/Button.tsx
import styles from './Button.module.css'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly loading?: boolean
  readonly variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ loading = false, variant = 'primary', disabled, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${styles.btn} ${styles[variant]}`}
    >
      {loading ? <span className={styles.spinner} aria-label="Loading" /> : children}
    </button>
  )
}
```

```tsx
// src/components/ui/Input.tsx
import styles from './Input.module.css'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  readonly label: string
  readonly error?: string
}

export function Input({ label, error, id, ...rest }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>{label}</label>
      <input id={inputId} {...rest} className={`${styles.input} ${error ? styles.hasError : ''}`} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
```

```tsx
// src/components/ui/Spinner.tsx
import styles from './Spinner.module.css'
export function Spinner() {
  return <div className={styles.spinner} aria-label="Loading" role="status" />
}
```

```tsx
// src/components/ui/ProductCard.tsx
import { Link } from 'react-router-dom'
import type { Product } from '../../types'
import styles from './ProductCard.module.css'

interface Props { readonly product: Product }

export function ProductCard({ product }: Props) {
  const thumb = product.images.find((i) => i.is_primary)?.thumbnail_url ?? 'https://placehold.co/300x300'
  return (
    <Link to={`/shop/${product.slug}`} className={styles.card}>
      <img src={thumb} alt={product.name} className={styles.image} />
      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>€{product.price.toFixed(2)}</p>
      </div>
    </Link>
  )
}
```

```tsx
// src/components/ui/ImageGallery.tsx
import { useState } from 'react'
import type { ProductImage } from '../../types'
import styles from './ImageGallery.module.css'

interface Props { readonly images: ProductImage[] }

export function ImageGallery({ images }: Props) {
  const primary = images.find((i) => i.is_primary) ?? images[0]
  const [active, setActive] = useState<ProductImage | undefined>(primary)
  if (!active) return null
  return (
    <div className={styles.gallery}>
      <img src={active.url} alt="Product" className={styles.main} />
      <div className={styles.thumbs}>
        {images.map((img) => (
          <button key={img.id} onClick={() => setActive(img)} className={`${styles.thumb} ${active.id === img.id ? styles.active : ''}`}>
            <img src={img.thumbnail_url} alt="" />
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create layout components**

```tsx
// src/components/layout/Navbar.tsx
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './Navbar.module.css'

export function Navbar() {
  const { user, logout } = useAuth()
  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.brand}>AlienzStore</Link>
      <div className={styles.links}>
        <Link to="/shop">Shop</Link>
        <Link to="/contact">Contact</Link>
        {user ? (
          <>
            <Link to="/account">Account</Link>
            {(user.role === 'admin' || user.role === 'owner') && <Link to="/admin">Admin</Link>}
            <button onClick={() => void logout()} className={styles.logoutBtn}>Logout</button>
          </>
        ) : (
          <Link to="/auth/login">Login</Link>
        )}
      </div>
    </nav>
  )
}
```

```tsx
// src/components/layout/Footer.tsx
import styles from './Footer.module.css'
export function Footer() {
  return <footer className={styles.footer}><p>© {new Date().getFullYear()} AlienzStore</p></footer>
}
```

```tsx
// src/components/layout/AdminLayout.tsx
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
```

- [ ] **Step 7: Create CSS Module stubs for all components**

Create empty `.module.css` files alongside each component (Button, Input, Spinner, ProductCard, ImageGallery, Navbar, Footer, AdminLayout). Fill with minimal styles after layout is wired up.

- [ ] **Step 8: Run tests — expect PASS**

```bash
npm run test:run -- src/components/ui/Button.test.tsx
```

- [ ] **Step 9: Commit**

```bash
git add src/styles/ src/components/
git commit -m "feat: add global styles, UI components, layout components"
```

---

### Task 8: Remaining API modules

**Files:**
- Create: `src/api/products.ts`, `categories.ts`, `enquiries.ts`, `wishlist.ts`, `account.ts`, `admin.ts`
- Test: `src/api/products.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/api/products.test.ts
import { vi } from 'vitest'
import { getProducts } from './products'

vi.mock('./client', () => ({
  getApiClient: vi.fn(() => ({
    get: vi.fn().mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20 },
    }),
  })),
}))

it('getProducts returns paginated response', async () => {
  const result = await getProducts({ page: 1 })
  expect(result.items).toEqual([])
  expect(result.total).toBe(0)
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm run test:run -- src/api/products.test.ts
```

- [ ] **Step 3: Create `src/api/products.ts`**

```ts
import { getApiClient } from './client'
import { PaginatedProductsSchema, ProductSchema } from './schemas/products'
import type { PaginatedResponse, Product } from '../types'

interface ProductFilters { page?: number; page_size?: number; category?: string; search?: string }

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
  const res = await getApiClient().get('/products', { params: filters })
  return PaginatedProductsSchema.parse(res.data)
}

export async function getProduct(slug: string): Promise<Product> {
  const res = await getApiClient().get(`/products/${slug}`)
  return ProductSchema.parse(res.data)
}
```

- [ ] **Step 4: Create `src/api/categories.ts`**

```ts
import { getApiClient } from './client'
import { CategoriesListSchema, CategorySchema } from './schemas/categories'
import type { Category } from '../types'

export async function getCategories(): Promise<Category[]> {
  const res = await getApiClient().get('/categories')
  return CategoriesListSchema.parse(res.data)
}

export async function createCategory(data: { name: string; sort_order: number }): Promise<Category> {
  const res = await getApiClient().post('/admin/categories', data)
  return CategorySchema.parse(res.data)
}

export async function updateCategory(id: string, data: { name?: string; sort_order?: number }): Promise<Category> {
  const res = await getApiClient().patch(`/admin/categories/${id}`, data)
  return CategorySchema.parse(res.data)
}

export async function deleteCategory(id: string): Promise<void> {
  await getApiClient().delete(`/admin/categories/${id}`)
}
```

- [ ] **Step 5: Create `src/api/enquiries.ts`**

```ts
import { getApiClient } from './client'
import { EnquirySchema, PaginatedEnquiriesSchema } from './schemas/enquiries'
import type { Enquiry, PaginatedResponse } from '../types'

export async function submitEnquiry(data: { name: string; email: string; message: string; product_id?: string }): Promise<Enquiry> {
  const res = await getApiClient().post('/enquiries', data)
  return EnquirySchema.parse(res.data)
}

export async function getAdminEnquiries(params: { page?: number; status?: string } = {}): Promise<PaginatedResponse<Enquiry>> {
  const res = await getApiClient().get('/admin/enquiries', { params })
  return PaginatedEnquiriesSchema.parse(res.data)
}

export async function updateEnquiryStatus(id: string, status: string): Promise<Enquiry> {
  const res = await getApiClient().patch(`/admin/enquiries/${id}`, { status })
  return EnquirySchema.parse(res.data)
}
```

- [ ] **Step 6: Create `src/api/wishlist.ts`**

```ts
import { getApiClient } from './client'
import { WishlistSchema } from './schemas/wishlist'
import type { WishlistItem } from '../types'

export async function getWishlist(): Promise<WishlistItem[]> {
  const res = await getApiClient().get('/account/wishlist')
  return WishlistSchema.parse(res.data)
}

export async function addToWishlist(product_id: string): Promise<void> {
  await getApiClient().post('/account/wishlist', { product_id })
}

export async function removeFromWishlist(product_id: string): Promise<void> {
  await getApiClient().delete(`/account/wishlist/${product_id}`)
}
```

- [ ] **Step 7: Create `src/api/account.ts`**

```ts
import { getApiClient } from './client'
import { AddressSchema } from './schemas/account'
import { UserSchema } from './schemas/auth'
import type { Address, User } from '../types'

export async function updateProfile(data: { first_name?: string; last_name?: string; email?: string }): Promise<User> {
  const res = await getApiClient().patch('/account/profile', data)
  return UserSchema.parse(res.data)
}

export async function changePassword(data: { current_password: string; new_password: string }): Promise<void> {
  await getApiClient().post('/account/change-password', data)
}

export async function getAddress(): Promise<Address | null> {
  try {
    const res = await getApiClient().get('/account/address')
    return AddressSchema.parse(res.data)
  } catch {
    return null
  }
}

export async function upsertAddress(data: Omit<Address, 'id' | 'user_id'>): Promise<Address> {
  const res = await getApiClient().put('/account/address', data)
  return AddressSchema.parse(res.data)
}
```

- [ ] **Step 8: Create `src/api/admin.ts`**

```ts
import { getApiClient } from './client'
import { AdminDashboardSchema, PaginatedUsersSchema, SiteConfigsSchema } from './schemas/admin'
import { ProductSchema, PaginatedProductsSchema } from './schemas/products'
import type { PaginatedResponse, Product, SiteConfig, User } from '../types'

export async function getDashboard() {
  const res = await getApiClient().get('/admin/dashboard')
  return AdminDashboardSchema.parse(res.data)
}

export async function getAdminProducts(params = {}): Promise<PaginatedResponse<Product>> {
  const res = await getApiClient().get('/admin/products', { params })
  return PaginatedProductsSchema.parse(res.data)
}

export async function createProduct(data: FormData): Promise<Product> {
  const res = await getApiClient().post('/admin/products', data, { headers: { 'Content-Type': 'multipart/form-data' } })
  return ProductSchema.parse(res.data)
}

export async function updateProduct(id: string, data: FormData): Promise<Product> {
  const res = await getApiClient().patch(`/admin/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
  return ProductSchema.parse(res.data)
}

export async function deleteProduct(id: string): Promise<void> {
  await getApiClient().delete(`/admin/products/${id}`)
}

export async function getClients(params = {}): Promise<PaginatedResponse<User>> {
  const res = await getApiClient().get('/admin/clients', { params })
  return PaginatedUsersSchema.parse(res.data)
}

export async function toggleClientActive(id: string, is_active: boolean): Promise<User> {
  const res = await getApiClient().patch(`/admin/clients/${id}`, { is_active })
  const { UserSchema } = await import('./schemas/auth')
  return UserSchema.parse(res.data)
}

export async function promoteToAdmin(id: string): Promise<User> {
  const res = await getApiClient().post(`/admin/clients/${id}/promote`)
  const { UserSchema } = await import('./schemas/auth')
  return UserSchema.parse(res.data)
}

export async function getSiteConfig(): Promise<SiteConfig[]> {
  const res = await getApiClient().get('/admin/settings')
  return SiteConfigsSchema.parse(res.data)
}

export async function updateSiteConfig(key: string, value: string): Promise<SiteConfig> {
  const res = await getApiClient().put(`/admin/settings/${key}`, { value })
  const { SiteConfigSchema } = await import('./schemas/admin')
  return SiteConfigSchema.parse(res.data)
}
```

- [ ] **Step 9: Run tests — expect PASS**

```bash
npm run test:run -- src/api/products.test.ts
```

- [ ] **Step 10: Commit**

```bash
git add src/api/
git commit -m "feat: add all API modules (products, categories, enquiries, wishlist, account, admin)"
```

---

### Task 9: Public pages — Home, Shop, Maintenance, Contact

**Files:**
- Create: `src/pages/public/HomePage.tsx`, `ShopPage.tsx`, `MaintenancePage.tsx`, `ContactPage.tsx`
- Test: `src/pages/public/ShopPage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/pages/public/ShopPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { ShopPage } from './ShopPage'

vi.mock('../../api/products', () => ({
  getProducts: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 }),
}))
vi.mock('../../api/categories', () => ({
  getCategories: vi.fn().mockResolvedValue([]),
}))

it('renders shop page with empty state', async () => {
  render(<MemoryRouter><ShopPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByText(/no products/i)).toBeInTheDocument())
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm run test:run -- src/pages/public/ShopPage.test.tsx
```

- [ ] **Step 3: Create `src/pages/public/ShopPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts } from '../../api/products'
import { getCategories } from '../../api/categories'
import { ProductCard } from '../../components/ui/ProductCard'
import { Spinner } from '../../components/ui/Spinner'
import type { Category, PaginatedResponse, Product } from '../../types'
import styles from './ShopPage.module.css'

export function ShopPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const page = parseInt(params.get('page') ?? '1', 10)
  const category = params.get('category') ?? undefined

  useEffect(() => {
    void getCategories().then(setCategories)
  }, [])

  useEffect(() => {
    setLoading(true)
    void getProducts({ page, category, page_size: 12 })
      .then(setData)
      .finally(() => setLoading(false))
  }, [page, category])

  if (loading) return <Spinner />

  return (
    <div className={styles.page}>
      <aside className={styles.filters}>
        <button onClick={() => setParams({})}>All</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setParams({ category: c.slug })}>{c.name}</button>
        ))}
      </aside>
      <section>
        {data?.items.length === 0 && <p>No products found.</p>}
        <div className={styles.grid}>
          {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        {data && data.total > data.page_size && (
          <div className={styles.pagination}>
            {page > 1 && <button onClick={() => setParams({ page: String(page - 1) })}>Prev</button>}
            <span>Page {page}</span>
            {data.total > page * data.page_size && <button onClick={() => setParams({ page: String(page + 1) })}>Next</button>}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/pages/public/HomePage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../../api/products'
import { ProductCard } from '../../components/ui/ProductCard'
import type { Product } from '../../types'
import styles from './HomePage.module.css'

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([])

  useEffect(() => {
    void getProducts({ page: 1, page_size: 4 }).then((r) => setFeatured(r.items))
  }, [])

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1>New Arrivals</h1>
        <Link to="/shop" className={styles.cta}>Shop Now</Link>
      </section>
      {featured.length > 0 && (
        <section className={styles.featured}>
          <h2>Featured</h2>
          <div className={styles.grid}>
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create `src/pages/public/MaintenancePage.tsx`**

```tsx
export function MaintenancePage() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <h1>We'll be back soon</h1>
      <p>The store is temporarily down for maintenance.</p>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/pages/public/ContactPage.tsx`**

```tsx
import { useState } from 'react'
import { submitEnquiry } from '../../api/enquiries'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import styles from './ContactPage.module.css'

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await submitEnquiry({ name, email, message })
      setSent(true)
    } catch {
      setError('Failed to send. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) return <p className={styles.success}>Thanks! We'll be in touch.</p>

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
      <h1>Contact Us</h1>
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <div className={styles.field}>
        <label htmlFor="message">Message</label>
        <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <Button type="submit" loading={loading}>Send</Button>
    </form>
  )
}
```

- [ ] **Step 7: Run tests — expect PASS**

```bash
npm run test:run -- src/pages/public/ShopPage.test.tsx
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/public/
git commit -m "feat: add public pages (Home, Shop, Contact, Maintenance)"
```

---

### Task 10: ProductDetailPage + enquiry form

**Files:**
- Create: `src/pages/public/ProductDetailPage.tsx`
- Test: `src/pages/public/ProductDetailPage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/pages/public/ProductDetailPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { ProductDetailPage } from './ProductDetailPage'

const mockProduct = {
  id: '1', name: 'Blue Dress', slug: 'blue-dress', description: 'Nice',
  price: 49.99, category_id: 'c1', sizes: ['S', 'M'], colors: ['Blue'],
  is_active: true, images: [], created_at: '', updated_at: '',
}

vi.mock('../../api/products', () => ({
  getProduct: vi.fn().mockResolvedValue(mockProduct),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ user: null }),
}))

it('shows product name and price', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByText('Blue Dress')).toBeInTheDocument())
  expect(screen.getByText('€49.99')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm run test:run -- src/pages/public/ProductDetailPage.test.tsx
```

- [ ] **Step 3: Create `src/pages/public/ProductDetailPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProduct } from '../../api/products'
import { submitEnquiry } from '../../api/enquiries'
import { ImageGallery } from '../../components/ui/ImageGallery'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { useAuth } from '../../hooks/useAuth'
import type { Product } from '../../types'
import styles from './ProductDetailPage.module.css'

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEnquiry, setShowEnquiry] = useState(false)
  const [name, setName] = useState(user ? `${user.first_name} ${user.last_name}` : '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!slug) return
    void getProduct(slug).then(setProduct).finally(() => setLoading(false))
  }, [slug])

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setSending(true)
    try {
      await submitEnquiry({ name, email, message, product_id: product.id })
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <Spinner />
  if (!product) return <p>Product not found.</p>

  return (
    <div className={styles.page}>
      <ImageGallery images={product.images} />
      <div className={styles.info}>
        <h1>{product.name}</h1>
        <p className={styles.price}>€{product.price.toFixed(2)}</p>
        <p>{product.description}</p>
        {product.sizes.length > 0 && <p>Sizes: {product.sizes.join(', ')}</p>}
        {product.colors.length > 0 && <p>Colors: {product.colors.join(', ')}</p>}
        {!showEnquiry && <Button onClick={() => setShowEnquiry(true)}>Enquire</Button>}
        {showEnquiry && !sent && (
          <form onSubmit={(e) => void handleEnquiry(e)} className={styles.enquiry}>
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div>
              <label htmlFor="msg">Message</label>
              <textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} />
            </div>
            <Button type="submit" loading={sending}>Send Enquiry</Button>
          </form>
        )}
        {sent && <p>Enquiry sent! We'll be in touch.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test:run -- src/pages/public/ProductDetailPage.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/public/ProductDetailPage.tsx src/pages/public/ProductDetailPage.test.tsx
git commit -m "feat: add ProductDetailPage with inline enquiry form"
```

---

### Task 11: Auth pages

**Files:**
- Create: `src/pages/auth/LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`
- Test: `src/pages/auth/LoginPage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/pages/auth/LoginPage.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { LoginPage } from './LoginPage'

const mockLogin = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ login: mockLogin, user: null }),
}))

it('calls login with email and password', async () => {
  mockLogin.mockResolvedValue(undefined)
  render(
    <MemoryRouter><Routes><Route path="*" element={<LoginPage />} /></Routes></MemoryRouter>
  )
  await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'secret')
  await userEvent.click(screen.getByRole('button', { name: /login/i }))
  expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'secret')
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm run test:run -- src/pages/auth/LoginPage.test.tsx
```

- [ ] **Step 3: Create `src/pages/auth/LoginPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/account')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
      <h1>Login</h1>
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className={styles.error}>{error}</p>}
      <Button type="submit" loading={loading}>Login</Button>
      <p><Link to="/auth/register">Register</Link> · <Link to="/auth/forgot-password">Forgot password?</Link></p>
    </form>
  )
}
```

- [ ] **Step 4: Create `src/pages/auth/RegisterPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import styles from './RegisterPage.module.css'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(form)
      navigate('/account')
    } catch {
      setError('Registration failed. Email may already be in use.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
      <h1>Create Account</h1>
      <Input label="First Name" value={form.first_name} onChange={set('first_name')} required />
      <Input label="Last Name" value={form.last_name} onChange={set('last_name')} required />
      <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
      <Input label="Password" type="password" value={form.password} onChange={set('password')} required />
      {error && <p className={styles.error}>{error}</p>}
      <Button type="submit" loading={loading}>Register</Button>
      <p>Already have an account? <Link to="/auth/login">Login</Link></p>
    </form>
  )
}
```

- [ ] **Step 5: Create `src/pages/auth/ForgotPasswordPage.tsx`**

```tsx
export function ForgotPasswordPage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Password Reset</h1>
      <p>Please contact the store to reset your password.</p>
    </div>
  )
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npm run test:run -- src/pages/auth/LoginPage.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/auth/
git commit -m "feat: add auth pages (Login, Register, ForgotPassword)"
```

---

### Task 12: Client area pages

**Files:**
- Create: `src/pages/account/AccountDashboardPage.tsx`, `OrdersPage.tsx`, `WishlistPage.tsx`, `ProfilePage.tsx`
- Test: `src/pages/account/WishlistPage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/pages/account/WishlistPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { WishlistPage } from './WishlistPage'

vi.mock('../../api/wishlist', () => ({
  getWishlist: vi.fn().mockResolvedValue([]),
  removeFromWishlist: vi.fn(),
}))

it('shows empty wishlist message', async () => {
  render(<MemoryRouter><WishlistPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByText(/wishlist is empty/i)).toBeInTheDocument())
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm run test:run -- src/pages/account/WishlistPage.test.tsx
```

- [ ] **Step 3: Create client area pages**

```tsx
// src/pages/account/AccountDashboardPage.tsx
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './AccountDashboardPage.module.css'

export function AccountDashboardPage() {
  const { user } = useAuth()
  return (
    <div className={styles.page}>
      <h1>Welcome, {user?.first_name}</h1>
      <nav className={styles.links}>
        <Link to="/account/orders">Order History</Link>
        <Link to="/account/wishlist">Wishlist</Link>
        <Link to="/account/profile">Profile & Address</Link>
      </nav>
    </div>
  )
}
```

```tsx
// src/pages/account/OrdersPage.tsx
import { useEffect, useState } from 'react'
import { getAdminEnquiries } from '../../api/enquiries'
import { Spinner } from '../../components/ui/Spinner'
import type { Enquiry } from '../../types'
import styles from './OrdersPage.module.css'

export function OrdersPage() {
  const [orders, setOrders] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Client sees only their own enquiries via /account/enquiries endpoint
    void fetch('/api/account/enquiries').then((r) => r.json()).then(setOrders).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (orders.length === 0) return <p>No orders yet.</p>

  return (
    <div className={styles.page}>
      <h1>Order History</h1>
      {orders.map((o) => (
        <div key={o.id} className={styles.row}>
          <span>{o.created_at.slice(0, 10)}</span>
          <span>{o.message.slice(0, 60)}</span>
          <span className={styles[o.status]}>{o.status}</span>
        </div>
      ))}
    </div>
  )
}
```

```tsx
// src/pages/account/WishlistPage.tsx
import { useEffect, useState } from 'react'
import { getWishlist, removeFromWishlist } from '../../api/wishlist'
import { ProductCard } from '../../components/ui/ProductCard'
import { Spinner } from '../../components/ui/Spinner'
import type { WishlistItem } from '../../types'
import styles from './WishlistPage.module.css'

export function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void getWishlist().then(setItems).finally(() => setLoading(false))
  }, [])

  const remove = async (product_id: string) => {
    await removeFromWishlist(product_id)
    setItems((prev) => prev.filter((i) => i.product_id !== product_id))
  }

  if (loading) return <Spinner />
  if (items.length === 0) return <p>Your wishlist is empty.</p>

  return (
    <div className={styles.page}>
      <h1>Wishlist</h1>
      <div className={styles.grid}>
        {items.map((item) => item.product && (
          <div key={item.id} className={styles.item}>
            <ProductCard product={item.product} />
            <button onClick={() => void remove(item.product_id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

```tsx
// src/pages/account/ProfilePage.tsx
import { useEffect, useState } from 'react'
import { getAddress, upsertAddress, updateProfile, changePassword } from '../../api/account'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import type { Address } from '../../types'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const { user } = useAuth()
  const [address, setAddress] = useState<Address | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addrForm, setAddrForm] = useState({ street: '', city: '', country: '', postal_code: '', is_default: true })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    void getAddress().then((a) => {
      setAddress(a)
      if (a) setAddrForm({ street: a.street, city: a.city, country: a.country, postal_code: a.postal_code, is_default: a.is_default })
    }).finally(() => setLoading(false))
  }, [])

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = await upsertAddress(addrForm)
      setAddress(saved)
      setMsg('Address saved.')
    } finally {
      setSaving(false)
    }
  }

  const savePw = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await changePassword(pwForm)
      setPwForm({ current_password: '', new_password: '' })
      setMsg('Password changed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className={styles.page}>
      <h1>Profile</h1>
      <p>{user?.first_name} {user?.last_name} — {user?.email}</p>
      {msg && <p className={styles.success}>{msg}</p>}
      <form onSubmit={(e) => void saveAddress(e)}>
        <h2>Address</h2>
        {(['street', 'city', 'country', 'postal_code'] as const).map((k) => (
          <Input key={k} label={k.replace('_', ' ')} value={addrForm[k]}
            onChange={(e) => setAddrForm((f) => ({ ...f, [k]: e.target.value }))} />
        ))}
        <Button type="submit" loading={saving}>Save Address</Button>
      </form>
      <form onSubmit={(e) => void savePw(e)}>
        <h2>Change Password</h2>
        <Input label="Current Password" type="password" value={pwForm.current_password}
          onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))} required />
        <Input label="New Password" type="password" value={pwForm.new_password}
          onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))} required />
        <Button type="submit" loading={saving}>Change Password</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test:run -- src/pages/account/WishlistPage.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/account/
git commit -m "feat: add client area pages (Dashboard, Orders, Wishlist, Profile)"
```

---

### Task 13: Admin products pages

**Files:**
- Create: `src/pages/admin/ProductsPage.tsx`, `ProductFormPage.tsx`
- Test: `src/pages/admin/ProductsPage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/pages/admin/ProductsPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { ProductsPage } from './ProductsPage'

vi.mock('../../api/admin', () => ({
  getAdminProducts: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 }),
  deleteProduct: vi.fn(),
}))

it('shows empty products state', async () => {
  render(<MemoryRouter><ProductsPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByText(/no products/i)).toBeInTheDocument())
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm run test:run -- src/pages/admin/ProductsPage.test.tsx
```

- [ ] **Step 3: Create `src/pages/admin/ProductsPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminProducts, deleteProduct } from '../../api/admin'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import type { PaginatedResponse, Product } from '../../types'
import styles from './ProductsPage.module.css'

export function ProductsPage() {
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    void getAdminProducts().then(setData).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const remove = async (id: string) => {
    if (!confirm('Delete this product?')) return
    await deleteProduct(id)
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Products</h1>
        <Link to="/admin/products/new"><Button>Add Product</Button></Link>
      </div>
      {data?.items.length === 0 && <p>No products yet.</p>}
      <table className={styles.table}>
        <tbody>
          {data?.items.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>€{p.price.toFixed(2)}</td>
              <td>{p.is_active ? 'Active' : 'Draft'}</td>
              <td>
                <Link to={`/admin/products/${p.id}`}>Edit</Link>
                <button onClick={() => void remove(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/pages/admin/ProductFormPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createProduct, updateProduct, getAdminProducts } from '../../api/admin'
import { getCategories } from '../../api/categories'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import type { Category, Product } from '../../types'
import styles from './ProductFormPage.module.css'

export function ProductFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<File[]>([])
  const [form, setForm] = useState({
    name: '', description: '', price: '', category_id: '',
    sizes: '', colors: '', is_active: true,
  })

  useEffect(() => {
    void getCategories().then(setCategories)
    if (isEdit && id) {
      void getAdminProducts().then((r) => {
        const p = r.items.find((x: Product) => x.id === id)
        if (p) setForm({
          name: p.name, description: p.description,
          price: String(p.price), category_id: p.category_id,
          sizes: p.sizes.join(','), colors: p.colors.join(','),
          is_active: p.is_active,
        })
      }).finally(() => setLoading(false))
    }
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('description', form.description)
      fd.append('price', form.price)
      fd.append('category_id', form.category_id)
      fd.append('sizes', JSON.stringify(form.sizes.split(',').map((s) => s.trim()).filter(Boolean)))
      fd.append('colors', JSON.stringify(form.colors.split(',').map((c) => c.trim()).filter(Boolean)))
      fd.append('is_active', String(form.is_active))
      images.forEach((f) => fd.append('images', f))
      if (isEdit && id) {
        await updateProduct(id, fd)
      } else {
        await createProduct(fd)
      }
      navigate('/admin/products')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
      <h1>{isEdit ? 'Edit Product' : 'Add Product'}</h1>
      <Input label="Name" value={form.name} onChange={set('name')} required />
      <div>
        <label htmlFor="desc">Description</label>
        <textarea id="desc" value={form.description} onChange={set('description')} rows={4} />
      </div>
      <Input label="Price" type="number" step="0.01" value={form.price} onChange={set('price')} required />
      <div>
        <label htmlFor="cat">Category</label>
        <select id="cat" value={form.category_id} onChange={set('category_id')} required>
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <Input label="Sizes (comma-separated)" value={form.sizes} onChange={set('sizes')} placeholder="XS,S,M,L,XL" />
      <Input label="Colors (comma-separated)" value={form.colors} onChange={set('colors')} placeholder="Black,White" />
      <div>
        <label>
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
          {' '}Published
        </label>
      </div>
      <div>
        <label htmlFor="imgs">Images</label>
        <input id="imgs" type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files ?? []))} />
      </div>
      <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Create Product'}</Button>
    </form>
  )
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm run test:run -- src/pages/admin/ProductsPage.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/ProductsPage.tsx src/pages/admin/ProductFormPage.tsx src/pages/admin/ProductsPage.test.tsx
git commit -m "feat: add admin products list and product form pages"
```

---

### Task 14: Remaining admin pages

**Files:**
- Create: `src/pages/admin/AdminDashboardPage.tsx`, `CategoriesPage.tsx`, `EnquiriesPage.tsx`, `ClientsPage.tsx`, `SettingsPage.tsx`
- Test: `src/pages/admin/SettingsPage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/pages/admin/SettingsPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { SettingsPage } from './SettingsPage'

vi.mock('../../api/admin', () => ({
  getSiteConfig: vi.fn().mockResolvedValue([
    { key: 'max_products', value: '15', updated_at: '' },
  ]),
  updateSiteConfig: vi.fn(),
}))

it('shows max_products config key', async () => {
  render(<MemoryRouter><SettingsPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByDisplayValue('15')).toBeInTheDocument())
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm run test:run -- src/pages/admin/SettingsPage.test.tsx
```

- [ ] **Step 3: Create `src/pages/admin/AdminDashboardPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { getDashboard } from '../../api/admin'
import { Spinner } from '../../components/ui/Spinner'
import { z } from 'zod'
import { AdminDashboardSchema } from '../../api/schemas/admin'
import styles from './AdminDashboardPage.module.css'

type Dashboard = z.infer<typeof AdminDashboardSchema>

export function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)

  useEffect(() => {
    void getDashboard().then(setData)
  }, [])

  if (!data) return <Spinner />

  return (
    <div className={styles.page}>
      <h1>Dashboard</h1>
      <div className={styles.stats}>
        <div className={styles.stat}><span>{data.product_count}</span><label>Products</label></div>
        <div className={styles.stat}><span>{data.new_enquiries}</span><label>New Enquiries</label></div>
        <div className={styles.stat}><span>{data.storage_used_mb.toFixed(0)} / {data.storage_quota_mb} MB</span><label>Storage</label></div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/pages/admin/CategoriesPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/categories'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import type { Category } from '../../types'
import styles from './CategoriesPage.module.css'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => void getCategories().then(setCategories).finally(() => setLoading(false))
  useEffect(load, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createCategory({ name: newName, sort_order: categories.length })
      setNewName('')
      load()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete category?')) return
    await deleteCategory(id)
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className={styles.page}>
      <h1>Categories</h1>
      <form onSubmit={(e) => void add(e)} className={styles.addForm}>
        <Input label="New category name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
        <Button type="submit" loading={saving}>Add</Button>
      </form>
      <ul className={styles.list}>
        {categories.map((c) => (
          <li key={c.id} className={styles.item}>
            <span>{c.name}</span>
            <button onClick={() => void remove(c.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/pages/admin/EnquiriesPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { getAdminEnquiries, updateEnquiryStatus } from '../../api/enquiries'
import { Spinner } from '../../components/ui/Spinner'
import type { Enquiry, PaginatedResponse } from '../../types'
import styles from './EnquiriesPage.module.css'

export function EnquiriesPage() {
  const [data, setData] = useState<PaginatedResponse<Enquiry> | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => void getAdminEnquiries().then(setData).finally(() => setLoading(false))
  useEffect(load, [])

  const setStatus = async (id: string, status: string) => {
    await updateEnquiryStatus(id, status)
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className={styles.page}>
      <h1>Enquiries</h1>
      {data?.items.length === 0 && <p>No enquiries yet.</p>}
      {data?.items.map((e) => (
        <div key={e.id} className={styles.card}>
          <p><strong>{e.name}</strong> ({e.email}) — {e.created_at.slice(0, 10)}</p>
          <p>{e.message}</p>
          <select value={e.status} onChange={(ev) => void setStatus(e.id, ev.target.value)}>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
          </select>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Create `src/pages/admin/ClientsPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { getClients, toggleClientActive, promoteToAdmin } from '../../api/admin'
import { Spinner } from '../../components/ui/Spinner'
import type { PaginatedResponse, User } from '../../types'
import styles from './ClientsPage.module.css'

export function ClientsPage() {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => void getClients().then(setData).finally(() => setLoading(false))
  useEffect(load, [])

  const toggle = async (id: string, is_active: boolean) => {
    await toggleClientActive(id, !is_active)
    load()
  }

  const promote = async (id: string) => {
    if (!confirm('Promote this user to admin?')) return
    await promoteToAdmin(id)
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className={styles.page}>
      <h1>Clients</h1>
      <table className={styles.table}>
        <tbody>
          {data?.items.map((u) => (
            <tr key={u.id}>
              <td>{u.first_name} {u.last_name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.is_active ? 'Active' : 'Disabled'}</td>
              <td>
                <button onClick={() => void toggle(u.id, u.is_active)}>{u.is_active ? 'Disable' : 'Enable'}</button>
                {u.role === 'client' && <button onClick={() => void promote(u.id)}>Make Admin</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 7: Create `src/pages/admin/SettingsPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { getSiteConfig, updateSiteConfig } from '../../api/admin'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import type { SiteConfig } from '../../types'
import styles from './SettingsPage.module.css'

export function SettingsPage() {
  const [config, setConfig] = useState<SiteConfig[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    void getSiteConfig().then((c) => {
      setConfig(c)
      setValues(Object.fromEntries(c.map((x) => [x.key, x.value])))
    }).finally(() => setLoading(false))
  }, [])

  const save = async (key: string) => {
    setSaving(key)
    try {
      await updateSiteConfig(key, values[key] ?? '')
      setMsg(`Saved ${key}`)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className={styles.page}>
      <h1>Site Settings</h1>
      {msg && <p className={styles.success}>{msg}</p>}
      {config.map((c) => (
        <div key={c.key} className={styles.row}>
          <label className={styles.key}>{c.key}</label>
          <input
            value={values[c.key] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [c.key]: e.target.value }))}
            className={styles.input}
          />
          <Button onClick={() => void save(c.key)} loading={saving === c.key}>Save</Button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
npm run test:run -- src/pages/admin/SettingsPage.test.tsx
```

- [ ] **Step 9: Commit**

```bash
git add src/pages/admin/
git commit -m "feat: add admin dashboard, categories, enquiries, clients, and settings pages"
```

---

### Task 15: Production build config + CSS Module stubs + deploy notes

**Files:**
- Modify: `vite.config.ts`
- Create: `.env.production`, `src/styles/*.module.css` stubs for each component

- [ ] **Step 1: Update `vite.config.ts` for SPA fallback + production**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 2: Create `.env.production`**

```
VITE_API_URL=https://your-vercel-project.vercel.app
```

Replace `your-vercel-project` with the actual Vercel deployment URL.

- [ ] **Step 3: Create empty CSS Module stubs**

For every component that imports a `.module.css` file, create the file with a comment placeholder. Example for `Button.module.css`:

```css
/* Button styles */
.btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: none; border-radius: var(--radius); cursor: pointer; font-size: 1rem; }
.primary { background: var(--accent); color: #fff; }
.primary:hover { background: var(--accent-hover); }
.secondary { background: transparent; border: 1px solid var(--border); color: var(--text-primary); }
.danger { background: var(--error); color: #fff; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.spinner { width: 1em; height: 1em; border: 2px solid transparent; border-top-color: currentColor; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

Create minimal matching `.module.css` files for: `Input`, `Spinner`, `ProductCard`, `ImageGallery`, `Navbar`, `Footer`, `AdminLayout`, and all page components.

- [ ] **Step 4: Hostinger deploy — build and upload**

```bash
npm run build
# Upload contents of dist/ to Hostinger public_html via FTP or File Manager
# In Hostinger settings, ensure the domain serves index.html for all paths (SPA mode)
# Hostinger → Website → File Manager → public_html → upload dist/* contents
```

For SPA routing to work on Hostinger, add a `.htaccess` file to `public/` (Vite copies it to `dist/`):

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

Create `public/.htaccess` with the above content.

- [ ] **Step 5: Run full test suite**

```bash
npm run test:run
```
Expected: all tests pass.

- [ ] **Step 6: Run production build**

```bash
npm run build
```
Expected: `dist/` created, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts .env.production public/.htaccess src/
git commit -m "feat: production build config, CSS module stubs, Hostinger deploy setup"
```

---

## Self-Review

**Spec coverage check:**
- Public routes (/, /shop, /shop/:slug, /contact, /maintenance) — Task 9, 10 ✓
- Auth routes (/auth/login, /auth/register, /auth/forgot-password) — Task 11 ✓
- Client area (/account, /account/orders, /account/wishlist, /account/profile) — Task 12 ✓
- Admin area (all /admin/* routes) — Tasks 13, 14 ✓
- /admin/settings owner-only gate — Task 6 (RequireOwner), Task 14 (SettingsPage) ✓
- JWT: access token in memory, refresh via httpOnly cookie — Task 4, 5 ✓
- Zod validation on all API responses — Task 3 ✓
- Route guards (RequireAuth, RequireAdmin, RequireOwner) — Task 6 ✓
- Image upload (multipart/form-data) in ProductFormPage — Task 13 ✓
- Maintenance mode page — Task 9 ✓
- Enquiry form on product detail page — Task 10 ✓
- Wishlist cap enforced server-side; frontend just calls the API — n/a ✓

**Type consistency check:**
- `Product`, `Category`, `User`, `Enquiry`, `WishlistItem`, `SiteConfig`, `PaginatedResponse<T>` defined in Task 2 and imported throughout ✓
- Zod schema names (`ProductSchema`, `CategorySchema`, etc.) match imports in API modules ✓
- `createApiClient` / `initApiClient` / `getApiClient` — defined in Task 4, used in Tasks 5, 8 ✓
- `useAuth` hook defined in Task 5, used in Tasks 6, 7, 11, 12, 13, 14 ✓
