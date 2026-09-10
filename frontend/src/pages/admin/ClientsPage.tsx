import { useCallback, useEffect, useState } from 'react'
import { getClients, toggleClientActive, promoteToAdmin } from '../../api/admin'
import { DataGrid, Pagination, useToast, Box, Stack } from '@shehandon/vcs-ui'
import type { ColumnDef } from '@shehandon/vcs-ui'
import { Eye, EyeOff, ShieldPlus } from 'lucide-react'
import { PageLoader } from '../../components/ui/PageLoader'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../contexts/ConfirmContext'
import type { PaginatedResponse, User } from '../../types'
import styles from './ClientsPage.module.css'

// See ProductsPage.tsx for why this cast is needed — DataGrid's Row type
// requires a string index signature our domain types don't declare.
type UserRow = User & Record<string, unknown>

const columns: ColumnDef<UserRow>[] = [
  { field: 'name', header: 'Name', renderCell: (_v, row) => `${row.first_name} ${row.last_name}` },
  { field: 'email', header: 'Email' },
  { field: 'role', header: 'Role' },
  { field: 'is_active', header: 'Active', align: 'center', renderCell: (v) => (v ? 'Yes' : 'No') },
]

export function ClientsPage() {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const { toast } = useToast()
  const confirm = useConfirm()

  const load = useCallback((p: number, s: string) => {
    setLoading(true)
    setLoadError(null)
    getClients({ page: p, page_size: 20, ...(s ? { search: s } : {}) })
      .then(setData)
      .catch(() => setLoadError('Failed to load clients. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(page, search)
  }, [page, search, load])

  async function handleToggleActive(user: UserRow) {
    try {
      const updated = await toggleClientActive(user.id, !user.is_active)
      setData((prev) => {
        if (!prev) return prev
        return { ...prev, items: prev.items.map((u) => (u.id === user.id ? updated : u)) }
      })
      toast({ title: user.is_active ? 'Client disabled.' : 'Client enabled.', variant: 'success' })
    } catch {
      toast({ title: 'Failed to update client status. Please try again.', variant: 'danger' })
    }
  }

  async function handlePromote(user: UserRow) {
    const ok = await confirm('Promote this client to admin? This grants full admin access.', { title: 'Promote to Admin', confirmLabel: 'Promote' })
    if (!ok) return
    try {
      const updated = await promoteToAdmin(user.id)
      setData((prev) => {
        if (!prev) return prev
        return { ...prev, items: prev.items.map((u) => (u.id === user.id ? updated : u)) }
      })
      toast({ title: 'Client promoted to admin.', variant: 'success' })
    } catch {
      toast({ title: 'Failed to promote client. Please try again.', variant: 'danger' })
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  if (loading) return <PageLoader />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  const items = data?.items ?? []

  return (
    <Box px={{ base: '4', md: '8' }} py={{ base: '6', md: '12' }}>
      <h1 className={styles.title}>Clients</h1>

      <Stack as="form" direction="row" align="end" gap="3" onSubmit={handleSearch} className={styles.searchForm}>
        <Input
          label="Search"
          aria-label="Search by name or email"
          placeholder="Search by name or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Button type="submit" variant="secondary">Search</Button>
      </Stack>

      <DataGrid<UserRow>
        rows={items as UserRow[]}
        columns={columns}
        options={{
          pagination: false,
          emptyMessage: 'No clients found.',
          rowActions: {
            extra: [
              {
                label: 'Disable',
                icon: <EyeOff size={14} strokeWidth={1.5} />,
                onClick: (row) => void handleToggleActive(row),
                canShow: (row) => row.is_active,
              },
              {
                label: 'Enable',
                icon: <Eye size={14} strokeWidth={1.5} />,
                onClick: (row) => void handleToggleActive(row),
                canShow: (row) => !row.is_active,
              },
              {
                label: 'Promote to Admin',
                icon: <ShieldPlus size={14} strokeWidth={1.5} />,
                onClick: (row) => void handlePromote(row),
                canShow: (row) => row.role === 'client',
              },
            ],
          },
        }}
      />

      {data && data.total > data.page_size && (
        <Stack direction="row" justify="center" className={styles.pagination}>
          <Pagination
            page={page}
            totalPages={Math.ceil(data.total / data.page_size)}
            onChange={setPage}
          />
        </Stack>
      )}
    </Box>
  )
}
