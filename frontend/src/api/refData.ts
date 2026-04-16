import { getApiClient } from './client'
import { RefItemSchema, RefItemListSchema } from './schemas/refData'

export interface RefItem {
  id: string
  name: string
  hex?: string
  sort_order: number
}

export async function getRefColors(): Promise<RefItem[]> {
  const res = await getApiClient().get('/admin/ref/colors')
  return RefItemListSchema.parse(res.data)
}

export async function addRefColor(name: string, hex: string): Promise<RefItem> {
  const res = await getApiClient().post('/admin/ref/colors', { name, hex })
  return RefItemSchema.parse(res.data)
}

export async function deleteRefColor(id: string): Promise<void> {
  await getApiClient().delete(`/admin/ref/colors/${id}`)
}

export async function getRefSizes(): Promise<RefItem[]> {
  const res = await getApiClient().get('/admin/ref/sizes')
  return RefItemListSchema.parse(res.data)
}

export async function addRefSize(name: string): Promise<RefItem> {
  const res = await getApiClient().post('/admin/ref/sizes', { name })
  return RefItemSchema.parse(res.data)
}

export async function deleteRefSize(id: string): Promise<void> {
  await getApiClient().delete(`/admin/ref/sizes/${id}`)
}

export async function reorderColors(items: { id: string; sort_order: number }[]): Promise<void> {
  await getApiClient().patch('/admin/ref/colors/reorder', items)
}

export async function reorderSizes(items: { id: string; sort_order: number }[]): Promise<void> {
  await getApiClient().patch('/admin/ref/sizes/reorder', items)
}

export type AttributeType = 'model' | 'fit' | 'material' | 'accessory_style'

export const ATTRIBUTE_LABELS: Record<AttributeType, string> = {
  model: 'Model',
  fit: 'Fit',
  material: 'Material',
  accessory_style: 'Accessory Style',
}

export async function getRefAttributes(type: AttributeType): Promise<RefItem[]> {
  const res = await getApiClient().get('/admin/ref/attributes', { params: { type } })
  return RefItemListSchema.parse(res.data)
}

export async function addRefAttribute(type: AttributeType, name: string): Promise<RefItem> {
  const res = await getApiClient().post('/admin/ref/attributes', { type, name })
  return RefItemSchema.parse(res.data)
}

export async function reorderAttributes(items: { id: string; sort_order: number }[]): Promise<void> {
  await getApiClient().patch('/admin/ref/attributes/reorder', items)
}

export async function deleteRefAttribute(id: string): Promise<void> {
  await getApiClient().delete(`/admin/ref/attributes/${id}`)
}
