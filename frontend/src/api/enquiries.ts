import { getApiClient } from './client'
import { EnquirySchema, PaginatedEnquiriesSchema } from './schemas/enquiries'
import type { Enquiry, PaginatedResponse } from '../types'

export async function submitEnquiry(data: {
  name: string
  email: string
  message: string
  product_id?: string
}): Promise<Enquiry> {
  const res = await getApiClient().post('/enquiries', data)
  return EnquirySchema.parse(res.data)
}

export async function getAdminEnquiries(
  params: { page?: number; status?: string } = {},
): Promise<PaginatedResponse<Enquiry>> {
  const res = await getApiClient().get('/admin/enquiries', { params })
  return PaginatedEnquiriesSchema.parse(res.data)
}

export async function updateEnquiryStatus(id: string, status: string): Promise<Enquiry> {
  const res = await getApiClient().patch(`/admin/enquiries/${id}`, { status })
  return EnquirySchema.parse(res.data)
}
