import { getApiClient } from './client'
import { EnquirySchema, PaginatedEnquiriesSchema } from './schemas/enquiries'
import type { Enquiry, PaginatedResponse } from '../types'

export interface EnquiryPayload {
  name: string
  email: string
  phone: string
  message?: string
  product_id?: string
  size?: string
  color?: string
  quantity?: number
}

export async function submitEnquiry(data: EnquiryPayload): Promise<Enquiry> {
  const res = await getApiClient().post('/enquiries', data)
  return EnquirySchema.parse(res.data)
}

export async function getMyEnquiries(
  params: { page?: number } = {},
): Promise<PaginatedResponse<Enquiry>> {
  const res = await getApiClient().get('/account/enquiries', { params })
  return PaginatedEnquiriesSchema.parse(res.data)
}

export async function getAdminEnquiries(
  params: {
    page?: number
    page_size?: number
    status?: string
    search?: string
    order_by?: string
    order_dir?: string
  } = {},
): Promise<PaginatedResponse<Enquiry>> {
  const res = await getApiClient().get('/admin/enquiries', { params })
  return PaginatedEnquiriesSchema.parse(res.data)
}

export async function updateEnquiryStatus(
  id: string,
  status: string,
  rejection_reason?: string,
): Promise<Enquiry> {
  const res = await getApiClient().patch(`/admin/enquiries/${id}`, {
    status,
    ...(rejection_reason !== undefined ? { rejection_reason } : {}),
  })
  return EnquirySchema.parse(res.data)
}
