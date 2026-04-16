export type Role = 'client' | 'admin' | 'owner'

export type EnquiryStatus = 'new' | 'read' | 'accepted' | 'rejected'

export interface User {
  id: string
  email: string
  role: Role
  first_name: string
  last_name: string
  phone: string
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
  show_in_navbar: boolean
}

export type CollabType = 'person' | 'logo'

export interface Collaborator {
  id: string
  name: string
  instagram_url: string
  image_url: string | null
  is_featured: boolean
  display_order: number
  collab_type: CollabType
  created_at: string
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
  category_id: string | null
  category_ids: string[]
  category?: Category
  sizes: string[]
  colors: string[]
  models: string[]
  fits: string[]
  materials: string[]
  accessory_styles: string[]
  is_active: boolean
  is_featured: boolean
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
  phone: string
  message: string
  size: string
  color: string
  quantity: number
  status: EnquiryStatus
  rejection_reason: string | null
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
