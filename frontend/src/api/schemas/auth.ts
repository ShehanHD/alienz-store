import { z } from 'zod'

export const RoleSchema = z.enum(['client', 'admin', 'owner'])

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: RoleSchema,
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().default(''),
  is_active: z.boolean(),
  created_at: z.string(),
})

export const TokenResponseSchema = z.object({
  access_token: z.string(),
})

export const AuthUserSchema = z.object({
  access_token: z.string(),
  user: UserSchema,
})

export const RegisterResponseSchema = z.object({
  detail: z.string(),
})

export const MessageResponseSchema = z.object({
  detail: z.string(),
})
