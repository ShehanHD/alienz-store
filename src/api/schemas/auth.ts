import { z } from 'zod'

export const RoleSchema = z.enum(['client', 'admin', 'owner'])

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: RoleSchema,
  first_name: z.string(),
  last_name: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
})

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
})

export const AuthUserSchema = z.object({
  access_token: z.string(),
  user: UserSchema,
})
