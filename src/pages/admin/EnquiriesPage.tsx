import { useCallback, useEffect, useState } from 'react'
import { getAdminEnquiries, updateEnquiryStatus } from '../../api/enquiries'
import { EnquiryStatusSchema } from '../../api/schemas/enquiries'
import { Spinner } from '../../components/ui/Spinner'
import type { Enquiry, EnquiryStatus, PaginatedResponse } from '../../types'
import styles from './EnquiriesPage.module.css'

const STATUS_OPTIONS: EnquiryStatus[] = ['new', 'read', 'replied']

export function EnquiriesPage() {
  const [data, setData] = useState<PaginatedResponse<Enquiry> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback((p: number, status: string) => {
    setLoading(true)
    setLoadError(null)
    getAdminEnquiries({ page: p, ...(status ? { status } : {}) })
      .then(setData)
      .catch(() => setLoadError('Failed to load enquiries. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(page, statusFilter)
  }, [page, statusFilter, load])

  async function handleStatusChange(id: string, rawStatus: string) {
    const status = EnquiryStatusSchema.parse(rawStatus)
    setUpdateError(null)
    try {
      const updated = await updateEnquiryStatus(id, status)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((e) => (e.id === id ? updated : e)),
        }
      })
    } catch {
      setUpdateError('Failed to update enquiry status. Please try again.')
    }
  }

  if (loading) return <Spinner />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  const items = data?.items ?? []

  return (
    <div className={styles.page}>
      <h1>Enquiries</h1>

      {updateError && <p role="alert" className={styles.error}>{updateError}</p>}

      <div className={styles.filters}>
        <label htmlFor="status-filter">Filter by status:</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value) }}
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <p>No enquiries found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Message</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((enq) => (
              <tr key={enq.id}>
                <td>{enq.name}</td>
                <td>{enq.email}</td>
                <td className={styles.message}>{enq.message}</td>
                <td>
                  <select
                    value={enq.status}
                    aria-label={`Status for enquiry from ${enq.name}`}
                    onChange={(e) => void handleStatusChange(enq.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>{new Date(enq.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data && data.total > data.page_size && (
        <div className={styles.pagination}>
          {page > 1 && (
            <button type="button" onClick={() => setPage((p) => p - 1)}>Prev</button>
          )}
          <span>Page {page}</span>
          {data.total > page * data.page_size && (
            <button type="button" onClick={() => setPage((p) => p + 1)}>Next</button>
          )}
        </div>
      )}
    </div>
  )
}
