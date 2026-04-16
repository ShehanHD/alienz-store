import { z } from 'zod'
import { getApiClient } from './client'
import { CollaboratorsListSchema, CollaboratorSchema } from './schemas/collaborators'
import type { Collaborator } from '../types'

export type CollaboratorPayload = Omit<Collaborator, 'id' | 'created_at'>

export async function getCollaborators(): Promise<Collaborator[]> {
  const res = await getApiClient().get('/collaborators')
  return CollaboratorsListSchema.parse(res.data)
}

export async function createCollaborator(data: CollaboratorPayload): Promise<Collaborator> {
  const res = await getApiClient().post('/collaborators', data)
  return CollaboratorSchema.parse(res.data)
}

export async function updateCollaborator(id: string, data: CollaboratorPayload): Promise<Collaborator> {
  const res = await getApiClient().put(`/collaborators/${id}`, data)
  return CollaboratorSchema.parse(res.data)
}

export async function deleteCollaborator(id: string): Promise<void> {
  await getApiClient().delete(`/collaborators/${id}`)
}

export async function reorderCollaborators(
  items: Array<{ id: string; display_order: number }>
): Promise<void> {
  await getApiClient().patch('/collaborators/reorder', items)
}

export async function uploadCollaboratorImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await getApiClient().post('/admin/collaborators/upload-image', formData, {
    headers: { 'Content-Type': undefined },
  })
  return z.object({ url: z.string() }).parse(res.data).url
}
