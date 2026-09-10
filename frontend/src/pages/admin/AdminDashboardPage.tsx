import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Card, Stat, Box, Grid, PieChart, LineChart, Progress } from '@shehandon/vcs-ui'
import type { PieDataPoint } from '@shehandon/vcs-ui'
import { getDashboard } from '../../api/admin'
import { AdminDashboardSchema } from '../../api/schemas/admin'
import { PageLoader } from '../../components/ui/PageLoader'
import styles from './AdminDashboardPage.module.css'

type Dashboard = z.infer<typeof AdminDashboardSchema>

// New / Read / Accepted / Rejected — amber / grey / green / red.
const STATUS_COLORS = ['#9a6700', '#71717a', '#16794c', '#b42318']

function shortDate(v: string | number): string {
  const [, m, d] = String(v).split('-')
  return m && d ? `${Number(m)}/${Number(d)}` : String(v)
}

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

  if (loading) return <PageLoader />
  if (error) return <p role="alert" className={styles.error}>{error}</p>
  if (!data) return null

  const { by_status } = data.enquiries
  const decided = by_status.accepted + by_status.rejected
  const acceptanceRate = decided > 0 ? Math.round((by_status.accepted / decided) * 100) : 0

  const clientsTrend = data.clients.prev_30d > 0
    ? Math.round(((data.clients.new_30d - data.clients.prev_30d) / data.clients.prev_30d) * 100)
    : undefined

  // This chart renders raw xKey values on the x-axis (it ignores xAxis
  // tickFormat), so pre-format the date to a short "M/D" label in the data.
  const volume = data.enquiries.last_14_days.map((d) => ({
    day: shortDate(d.date),
    count: d.count,
  }))

  const statusData: PieDataPoint[] = [
    { label: 'New', value: by_status.new },
    { label: 'Read', value: by_status.read },
    { label: 'Accepted', value: by_status.accepted },
    { label: 'Rejected', value: by_status.rejected },
  ]

  return (
    <Box px={{ base: '4', md: '8' }} py={{ base: '6', md: '12' }}>
      <h1 className={styles.title}>Dashboard</h1>

      {/* KPI cards */}
      <Grid minColWidth="200px" gap="6">
        <Card padding="md">
          <Stat label="Products" value={data.products.total} sublabel={`${data.products.active} active / ${data.products.max} max`} size="lg" />
        </Card>
        <Card padding="md">
          <Stat label="New Enquiries" value={data.enquiries.new} sublabel={`${data.enquiries.total} total`} size="lg" />
        </Card>
        <Card padding="md">
          <Stat label="Clients" value={data.clients.total} trend={clientsTrend} sublabel={`${data.clients.new_30d} new in 30 days`} size="lg" />
        </Card>
        <Card padding="md">
          {/* TODO: storage used_mb not yet returned by API */}
          <Stat label="Storage" value={`${data.storage.quota_mb} MB`} sublabel="Quota (used: N/A)" size="lg" />
        </Card>
      </Grid>

      {/* Charts — donut + gauge share a row; volume gets its own full width */}
      <Grid columns={{ base: 1, md: 2 }} gap="6" className={styles.charts}>
        <Card padding="md">
          <p className={styles.chartTitle}>Enquiries by Status</p>
          <PieChart variant='breakdown' data={statusData} donut height={200} colors={STATUS_COLORS} legend="right" aria-label="Enquiries by status" />
        </Card>

        <Card padding="md">
          <p className={styles.chartTitle}>Acceptance Rate</p>
          <div className={styles.gauge}>
            <Progress variant="circle" value={acceptanceRate} showValue size="lg" className={styles.gaugeCircle} />
            <p className={styles.gaugeNote}>{by_status.accepted} accepted / {decided} decided</p>
          </div>
        </Card>
      </Grid>

      <Card padding="md" className={styles.volumeCard}>
        <p className={styles.chartTitle}>Enquiry Volume · Last 14 Days</p>
        <LineChart
          data={volume}
          xKey="day"
          series={[{ key: 'count', label: 'Enquiries' }]}
          height={220}
          curve="smooth"
          tooltip
          grid={{ y: true }}
          yAxis={{ tickFormat: (v) => (Number.isInteger(Number(v)) ? String(v) : '') }}
          aria-label="Enquiry volume over the last 14 days"
        />
      </Card>
    </Box>
  )
}
