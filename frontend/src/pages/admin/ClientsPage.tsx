import { useCallback, useEffect, useState } from 'react'
import { getClients, toggleClientActive, promoteToAdmin } from '../../api/admin'
import { Button } from '../../components/ui/Button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageLoader } from '../../components/ui/PageLoader'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import type { PaginatedResponse, User } from '../../types'
import styles from './ClientsPage.module.css'

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

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    try {
      const updated = await toggleClientActive(id, !currentlyActive)
      setData((prev) => {
        if (!prev) return prev
        return { ...prev, items: prev.items.map((u) => (u.id === id ? updated : u)) }
      })
      toast(currentlyActive ? 'Client disabled.' : 'Client enabled.', 'success')
    } catch {
      toast('Failed to update client status. Please try again.', 'error')
    }
  }

  async function handlePromote(id: string) {
    const ok = await confirm('Promote this client to admin? This grants full admin access.', { title: 'Promote to Admin', confirmLabel: 'Promote' })
    if (!ok) return
    try {
      const updated = await promoteToAdmin(id)
      setData((prev) => {
        if (!prev) return prev
        return { ...prev, items: prev.items.map((u) => (u.id === id ? updated : u)) }
      })
      toast('Client promoted to admin.', 'success')
    } catch {
      toast('Failed to promote client. Please try again.', 'error')
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
    <div className={styles.page}>
      <h1>Clients</h1>

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {items.length === 0 ? (
        <p>No clients found.</p>
      ) : (
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.id}>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.is_active ? 'Yes' : 'No'}</td>
                <td className={styles.actions}>
                  <Button type="button" variant="secondary" onClick={() => void handleToggleActive(user.id, user.is_active)}>
                    {user.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  {user.role === 'client' && (
                    <Button type="button" variant="secondary" onClick={() => void handlePromote(user.id)}>Promote to Admin</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {data && data.total > data.page_size && (
        <div className={styles.pagination}>
          {page > 1 && <button type="button" className={styles.pageBtn} onClick={() => setPage((p) => p - 1)} aria-label="Previous"><ChevronLeft size={14} strokeWidth={1.5} /></button>}
          <span>Page {page}</span>
          {data.total > page * data.page_size && <button type="button" className={styles.pageBtn} onClick={() => setPage((p) => p + 1)} aria-label="Next"><ChevronRight size={14} strokeWidth={1.5} /></button>}
        </div>
      )}
    </div>
  )
}
