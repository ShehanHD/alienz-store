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
