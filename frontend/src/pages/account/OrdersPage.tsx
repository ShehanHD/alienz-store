import { useEffect, useState } from 'react'
import { z } from 'zod'
import { getApiClient } from '../../api/client'
import { EnquirySchema } from '../../api/schemas'
import styles from './OrdersPage.module.css'

type Enquiry = z.infer<typeof EnquirySchema>

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
        <p className={styles.empty}>No orders yet.</p>
      )}
      {!loading && !error && enquiries.length > 0 && (
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
