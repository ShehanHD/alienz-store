import { useEffect, useState } from 'react'
import { getClients, toggleClientActive, promoteToAdmin } from '../../api/admin'
import { Spinner } from '../../components/ui/Spinner'
import type { PaginatedResponse, User } from '../../types'
import styles from './ClientsPage.module.css'

export function ClientsPage() {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  function load(p: number, s: string) {
    setLoading(true)
    setLoadError(null)
    getClients({ page: p, page_size: 20, ...(s ? { search: s } : {}) })
      .then(setData)
      .catch(() => setLoadError('Failed to load clients. Please try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(page, search)
  }, [page, search])

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    setActionError(null)
    try {
      const updated = await toggleClientActive(id, !currentlyActive)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((u) => (u.id === id ? updated : u)),
        }
      })
    } catch {
      setActionError('Failed to update client status. Please try again.')
    }
  }

  async function handlePromote(id: string) {
    if (!window.confirm('Promote this client to admin?')) return
    setActionError(null)
    try {
      const updated = await promoteToAdmin(id)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((u) => (u.id === id ? updated : u)),
        }
      })
    } catch {
      setActionError('Failed to promote client. Please try again.')
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  if (loading) return <Spinner />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  const items = data?.items ?? []

  return (
    <div className={styles.page}>
      <h1>Clients</h1>

      {actionError && <p role="alert" className={styles.error}>{actionError}</p>}

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {items.length === 0 ? (
        <p>No clients found.</p>
      ) : (
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
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(user.id, user.is_active)}
                  >
                    {user.is_active ? 'Disable' : 'Enable'}
                  </button>
                  {user.role === 'client' && (
                    <button
                      type="button"
                      onClick={() => void handlePromote(user.id)}
                    >
                      Promote to Admin
                    </button>
                  )}
                </td>
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
