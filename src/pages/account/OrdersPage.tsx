import { useEffect, useState } from 'react'
import { z } from 'zod'
import { getApiClient } from '../../api/client'
import type { Enquiry } from '../../types'
import styles from './OrdersPage.module.css'

const EnquiryStatusSchema = z.enum(['new', 'read', 'replied'])

const EnquirySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  product_id: z.string().uuid().nullable(),
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
  status: EnquiryStatusSchema,
  created_at: z.string(),
})

const EnquiriesListSchema = z.array(EnquirySchema)

export function OrdersPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getApiClient()
      .get('/account/enquiries')
      .then((res) => {
        const parsed = EnquiriesListSchema.parse(res.data)
        setEnquiries(parsed)
      })
      .catch(() => setError('Failed to load enquiries. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Enquiries</h1>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading && <p>Loading…</p>}
      {!loading && !error && enquiries.length === 0 && (
        <p className={styles.empty}>You have no enquiries yet.</p>
      )}
      {!loading && enquiries.length > 0 && (
        <ul className={styles.list}>
          {enquiries.map((enq) => (
            <li key={enq.id} className={styles.item}>
              <p>{enq.message}</p>
              <p className={styles.meta}>
                <span className={styles.status}>{enq.status}</span>{' '}
                {new Date(enq.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
