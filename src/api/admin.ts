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

export async function getDashboard(): Promise<z.infer<typeof AdminDashboardSchema>> {
  const res = await getApiClient().get('/admin/dashboard')
  return AdminDashboardSchema.parse(res.data)
}

export async function getAdminProducts(params: Record<string, unknown> = {}): Promise<PaginatedResponse<Product>> {
  const res = await getApiClient().get('/admin/products', { params })
  return PaginatedProductsSchema.parse(res.data)
}

export async function createProduct(data: FormData): Promise<Product> {
  const res = await getApiClient().post('/admin/products', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return ProductSchema.parse(res.data)
}

export async function updateProduct(id: string, data: FormData): Promise<Product> {
  const res = await getApiClient().patch(`/admin/products/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return ProductSchema.parse(res.data)
}

export async function deleteProduct(id: string): Promise<void> {
  await getApiClient().delete(`/admin/products/${id}`)
}

export async function getClients(
  params: Record<string, unknown> = {},
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
