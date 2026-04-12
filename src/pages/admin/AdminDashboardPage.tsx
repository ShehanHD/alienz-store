import { useEffect, useState } from 'react'
import { z } from 'zod'
import { getDashboard } from '../../api/admin'
import { AdminDashboardSchema } from '../../api/schemas/admin'
import { Spinner } from '../../components/ui/Spinner'
import styles from './AdminDashboardPage.module.css'

type Dashboard = z.infer<typeof AdminDashboardSchema>

export function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setError('Failed to load dashboard. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (error) return <p role="alert" className={styles.error}>{error}</p>
  if (!data) return null

  return (
    <div className={styles.page}>
      <h1>Dashboard</h1>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>Products</h2>
          <p className={styles.stat}>{data.products.total}</p>
          <p className={styles.sub}>{data.products.active} active / {data.products.max} max</p>
        </div>
        <div className={styles.card}>
          <h2>New Enquiries</h2>
          <p className={styles.stat}>{data.enquiries.new}</p>
          <p className={styles.sub}>{data.enquiries.total} total</p>
        </div>
        <div className={styles.card}>
          <h2>Clients</h2>
          <p className={styles.stat}>{data.clients.total}</p>
        </div>
        <div className={styles.card}>
          <h2>Storage</h2>
          <p className={styles.sub}>Quota: {data.storage.quota_mb} MB</p>
          <p className={styles.sub}>Used: N/A</p>
        </div>
      </div>
    </div>
  )
}
