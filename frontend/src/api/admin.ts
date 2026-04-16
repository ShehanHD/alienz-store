import { z } from 'zod'
import { getApiClient } from './client'
import {
  AdminDashboardSchema,
  PaginatedAdminUsersSchema,
  SiteConfigSchema,
} from './schemas/admin'
import { ProductSchema, PaginatedProductsSchema } from './schemas/products'
import { UserSchema } from './schemas/auth'
import type { PaginatedResponse, Product, SiteConfig, User } from '../types'

interface AdminProductFilters { page?: number; page_size?: number; category?: string; search?: string; is_active?: boolean }
interface AdminClientFilters { page?: number; page_size?: number; search?: string }

export async function getDashboard(): Promise<z.infer<typeof AdminDashboardSchema>> {
  const res = await getApiClient().get('/admin/dashboard')
  return AdminDashboardSchema.parse(res.data)
}

export async function getAdminProducts(params: AdminProductFilters = {}): Promise<PaginatedResponse<Product>> {
  const res = await getApiClient().get('/admin/products', { params })
  return PaginatedProductsSchema.parse(res.data)
}

export interface ProductPayload {
  name: string
  description: string
  price: number
  category_ids: string[]
  sizes: string[]
  colors: string[]
  models: string[]
  fits: string[]
  materials: string[]
  accessory_styles: string[]
  is_active: boolean
  is_featured: boolean
}

export async function createProduct(data: ProductPayload): Promise<Product> {
  const res = await getApiClient().post('/admin/products', data)
  return ProductSchema.parse(res.data)
}

export async function updateProduct(id: string, data: ProductPayload): Promise<Product> {
  const res = await getApiClient().put(`/admin/products/${id}`, data)
  return ProductSchema.parse(res.data)
}

export async function deleteProduct(id: string): Promise<void> {
  await getApiClient().delete(`/admin/products/${id}`)
}

export async function getClients(
  params: AdminClientFilters = {},
): Promise<PaginatedResponse<User>> {
  const res = await getApiClient().get('/admin/clients', { params })
  return PaginatedAdminUsersSchema.parse(res.data)
}

export async function toggleClientActive(id: string, is_active: boolean): Promise<User> {
  const endpoint = is_active ? `/admin/clients/${id}/enable` : `/admin/clients/${id}/disable`
  const res = await getApiClient().put(endpoint)
  return UserSchema.parse(res.data)
}

export async function promoteToAdmin(id: string): Promise<User> {
  const res = await getApiClient().post(`/admin/clients/${id}/promote`)
  return UserSchema.parse(res.data)
}

export async function getSiteConfig(): Promise<SiteConfig[]> {
  const res = await getApiClient().get('/admin/settings')
  return z.array(SiteConfigSchema).parse(res.data)
}

export async function updateSiteConfig(key: string, value: string): Promise<SiteConfig> {
  const res = await getApiClient().put(`/admin/settings/${key}`, { value })
  return SiteConfigSchema.parse(res.data)
}

export async function getImageConfig(): Promise<{ max_images_per_product: number; max_upload_size_mb: number }> {
  const res = await getApiClient().get('/admin/image-config')
  return res.data as { max_images_per_product: number; max_upload_size_mb: number }
}

export async function uploadProductImage(productId: string, file: File): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  // Clear Content-Type so Axios auto-sets multipart/form-data with the correct boundary
  await getApiClient().post(`/admin/products/${productId}/images`, form, {
    headers: { 'Content-Type': undefined },
  })
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  await getApiClient().delete(`/admin/products/${productId}/images/${imageId}`)
}

export async function setPrimaryImage(productId: string, imageId: string): Promise<void> {
  await getApiClient().put(`/admin/products/${productId}/images/${imageId}/primary`)
}
