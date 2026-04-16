import { ZodError } from 'zod'
import { getApiClient } from './client'
import { AuthUserSchema, MessageResponseSchema, RegisterResponseSchema, TokenResponseSchema, UserSchema } from './schemas/auth'
import type { User } from '../types'

export async function login(email: string, password: string): Promise<{ access_token: string; user: User }> {
  const res = await getApiClient().post('/auth/login', { email, password })
  return AuthUserSchema.parse(res.data)
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phone: string,
): Promise<{ detail: string }> {
  const res = await getApiClient().post('/auth/register', {
    email,
    password,
    first_name: firstName,
    last_name: lastName,
    phone,
  })
  return RegisterResponseSchema.parse(res.data)
}

export async function confirmEmail(token: string): Promise<{ detail: string }> {
  const res = await getApiClient().get(`/auth/confirm-email?token=${encodeURIComponent(token)}`)
  return MessageResponseSchema.parse(res.data)
}

export async function resendConfirmation(email: string): Promise<{ detail: string }> {
  const res = await getApiClient().post('/auth/resend-confirmation', { email })
  return MessageResponseSchema.parse(res.data)
}

export async function refreshToken(): Promise<string | null> {
  try {
    const res = await getApiClient().post('/auth/refresh')
    const parsed = TokenResponseSchema.parse(res.data)
    return parsed.access_token
  } catch (err) {
    if (err instanceof ZodError) throw err
    return null
  }
}

export async function logout(): Promise<void> {
  await getApiClient().post('/auth/logout')
}

export async function getMe(): Promise<User> {
  const res = await getApiClient().get('/auth/me')
  return UserSchema.parse(res.data)
}

export async function forgotPassword(email: string): Promise<void> {
  await getApiClient().post('/auth/forgot-password', { email })
}
