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

export async function reorderCategories(items: { id: string; sort_order: number }[]): Promise<void> {
  await getApiClient().patch('/admin/categories/reorder', items)
}

export async function toggleCategoryNavbar(id: string): Promise<{ id: string; show_in_navbar: boolean }> {
  const res = await getApiClient().patch(`/admin/categories/${id}/navbar`)
  return res.data as { id: string; show_in_navbar: boolean }
}
