import { useCallback, useEffect, useState } from 'react'
import { getCategories, createCategory, deleteCategory, reorderCategories, toggleCategoryNavbar } from '../../api/categories'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/PageLoader'
import { useDragSort } from '../../hooks/useDragSort'
import { Switch, useToast, Box, Stack } from '@shehandon/vcs-ui'
import { useConfirm } from '../../contexts/ConfirmContext'
import { Trash2, Plus } from 'lucide-react'
import type { Category } from '../../types'
import styles from './CategoriesPage.module.css'

function DragIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
      <circle cx="4" cy="3" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
      <circle cx="4" cy="8" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
      <circle cx="4" cy="13" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
    </svg>
  )
}

export function CategoriesPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const confirm = useConfirm()

  const { items: categories, sync, draggingId, onDragStart, onDragOver, onDragEnd } =
    useDragSort<Category>([], async (reordered) => {
      try {
        await reorderCategories(reordered.map((c, i) => ({ id: c.id, sort_order: i * 10 })))
      } catch { /* non-critical */ }
    })

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getCategories()
      .then(sync)
      .catch(() => setLoadError('Failed to load categories. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSubmitting(true)
    try {
      const created = await createCategory({ name: newName.trim(), sort_order: categories.length * 10 })
      setNewName('')
      toast({ title: 'Category created.', variant: 'success' })
      sync([...categories, created])
    } catch {
      toast({ title: 'Failed to create category. Please try again.', variant: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm('Delete this category?', { title: 'Delete Category', confirmLabel: 'Delete', variant: 'danger' })
    if (!ok) return
    try {
      await deleteCategory(id)
      toast({ title: 'Category deleted.', variant: 'success' })
      sync(categories.filter((c) => c.id !== id))
    } catch {
      toast({ title: 'Failed to delete category. Please try again.', variant: 'danger' })
    }
  }

  async function handleToggleNavbar(id: string) {
    try {
      const { show_in_navbar } = await toggleCategoryNavbar(id)
      sync(categories.map((c) => c.id === id ? { ...c, show_in_navbar } : c))
    } catch { /* non-critical */ }
  }

  if (loading) return <PageLoader />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  return (
    <Box px={{ base: '4', md: '8' }} py={{ base: '6', md: '12' }}>
      <h1 className={styles.title}>Categories</h1>

      <Stack as="form" direction="row" align="end" wrap gap="3" onSubmit={(e) => void handleCreate(e)} className={styles.form}>
        <Input
          label="Category name"
          aria-label="Category name"
          placeholder="Category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
        <Button type="submit" loading={submitting}><Plus size={13} strokeWidth={1.5} aria-hidden="true" /> Add</Button>
      </Stack>

      {categories.length === 0 ? (
        <p className={styles.empty}>No categories found.</p>
      ) : (
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <colgroup>
            <col className={styles.colDrag} />
            <col className={styles.colName} />
            <col className={styles.colNarrow} />
            <col className={styles.colActions} />
          </colgroup>
          <thead>
            <tr>
              <th />
              <th>Name</th>
              <th>Navbar</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, index) => (
              <tr
                key={cat.id}
                className={draggingId === cat.id ? styles.rowDragging : undefined}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDragEnd}
              >
                <td className={styles.dragCell}><DragIcon /></td>
                <td>{cat.name}</td>
                <td className={styles.centreCell}>
                  <Switch
                    checked={cat.show_in_navbar}
                    onChange={() => void handleToggleNavbar(cat.id)}
                    aria-label="Show in navbar"
                  />
                </td>
                <td className={styles.actionsCell}>
                  <Button variant="danger" shape="square" size="sm" onClick={() => void handleDelete(cat.id)} title="Delete" aria-label="Delete category">
                    <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </Box>
  )
}
