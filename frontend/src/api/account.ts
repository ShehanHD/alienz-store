import axios from 'axios'
import { getApiClient } from './client'
import { AddressSchema } from './schemas/account'
import { UserSchema } from './schemas/auth'
import type { Address, User } from '../types'

export async function updateProfile(data: {
  first_name: string
  last_name: string
  phone: string
}): Promise<User> {
  const res = await getApiClient().put('/account/profile', data)
  return UserSchema.parse(res.data)
}

export async function changePassword(data: {
  current_password: string
  new_password: string
}): Promise<void> {
  await getApiClient().post('/account/change-password', data)
}

export async function getAddress(): Promise<Address | null> {
  try {
    const res = await getApiClient().get('/account/address')
    if (!res.data) return null
    return AddressSchema.parse(res.data)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null
    throw err
  }
}

export async function upsertAddress(data: Omit<Address, 'id' | 'user_id'>): Promise<Address> {
  const res = await getApiClient().put('/account/address', data)
  return AddressSchema.parse(res.data)
}
