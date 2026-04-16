import { getApiClient } from './client'
import { PaginatedProductsSchema, ProductSchema } from './schemas/products'
import type { PaginatedResponse, Product } from '../types'

interface ProductFilters {
  page?: number
  page_size?: number
  category?: string
  search?: string
  min_price?: number
  max_price?: number
  color?: string
  size?: string
}

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
  const res = await getApiClient().get('/products', { params: filters })
  return PaginatedProductsSchema.parse(res.data)
}

export async function getProduct(slug: string): Promise<Product> {
  const res = await getApiClient().get(`/products/${slug}`)
  return ProductSchema.parse(res.data)
}

export interface ProductFilterColor { name: string; hex: string }

export async function getProductFilters(): Promise<{ colors: ProductFilterColor[]; sizes: string[] }> {
  const res = await getApiClient().get('/products/filters')
  return res.data as { colors: ProductFilterColor[]; sizes: string[] }
}
