import { useEffect, useState } from 'react'
import { getCategories, createCategory, deleteCategory } from '../../api/categories'
import { Spinner } from '../../components/ui/Spinner'
import type { Category } from '../../types'
import styles from './CategoriesPage.module.css'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newSortOrder, setNewSortOrder] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  function load() {
    setLoading(true)
    setLoadError(null)
    getCategories()
      .then(setCategories)
      .catch(() => setLoadError('Failed to load categories. Please try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreateError(null)
    setSubmitting(true)
    try {
      await createCategory({ name: newName.trim(), sort_order: newSortOrder })
      setNewName('')
      setNewSortOrder(0)
      load()
    } catch {
      setCreateError('Failed to create category. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this category?')) return
    setDeleteError(null)
    try {
      await deleteCategory(id)
      load()
    } catch {
      setDeleteError('Failed to delete category. Please try again.')
    }
  }

  if (loading) return <Spinner />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  return (
    <div className={styles.page}>
      <h1>Categories</h1>

      {createError && <p role="alert" className={styles.error}>{createError}</p>}
      {deleteError && <p role="alert" className={styles.error}>{deleteError}</p>}

      <form onSubmit={(e) => void handleCreate(e)} className={styles.form}>
        <input
          type="text"
          placeholder="Category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Sort order"
          value={newSortOrder}
          onChange={(e) => setNewSortOrder(Number(e.target.value))}
          min={0}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add Category'}
        </button>
      </form>

      {categories.length === 0 ? (
        <p>No categories found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Sort Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td>{cat.name}</td>
                <td>{cat.slug}</td>
                <td>{cat.sort_order}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => void handleDelete(cat.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
