import { getApiClient } from './client'
import { CollaboratorsListSchema, CollaboratorSchema } from './schemas/collaborators'
import type { Collaborator } from '../types'

export async function getCollaborators(): Promise<Collaborator[]> {
  const res = await getApiClient().get('/collaborators')
  return CollaboratorsListSchema.parse(res.data)
}

export async function createCollaborator(
  data: Omit<Collaborator, 'id' | 'created_at'>
): Promise<Collaborator> {
  const res = await getApiClient().post('/collaborators', data)
  return CollaboratorSchema.parse(res.data)
}

export async function updateCollaborator(
  id: string,
  data: Omit<Collaborator, 'id' | 'created_at'>
): Promise<Collaborator> {
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
