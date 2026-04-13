import { getApiClient } from './client'
import { PaginatedProductsSchema, ProductSchema } from './schemas/products'
import type { PaginatedResponse, Product } from '../types'

interface ProductFilters {
  page?: number
  page_size?: number
  category?: string
  search?: string
}

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
  const res = await getApiClient().get('/products', { params: filters })
  return PaginatedProductsSchema.parse(res.data)
}

export async function getProduct(slug: string): Promise<Product> {
  const res = await getApiClient().get(`/products/${slug}`)
  return ProductSchema.parse(res.data)
}
