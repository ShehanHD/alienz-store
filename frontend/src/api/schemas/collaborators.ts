import { z } from 'zod'

export const CollaboratorSchema = z.object({
  id: z.string(),
  name: z.string(),
  instagram_url: z.string(),
  image_url: z.string().nullable(),
  is_featured: z.boolean(),
  display_order: z.number(),
  collab_type: z.enum(['person', 'logo']).default('person'),
  created_at: z.string(),
}).passthrough()

export const CollaboratorsListSchema = z.array(CollaboratorSchema)
