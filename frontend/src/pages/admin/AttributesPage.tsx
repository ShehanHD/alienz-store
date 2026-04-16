import { useCallback, useEffect, useState } from 'react'
import {
  getRefAttributes, addRefAttribute, deleteRefAttribute, reorderAttributes,
  ATTRIBUTE_LABELS,
} from '../../api/refData'
import type { RefItem, AttributeType } from '../../api/refData'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/PageLoader'
import { useDragSort } from '../../hooks/useDragSort'
import { useConfirm } from '../../contexts/ConfirmContext'
import { Trash2, Plus } from 'lucide-react'
import styles from './AttributesPage.module.css'

const TYPES: AttributeType[] = ['model', 'fit', 'material', 'accessory_style']

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

interface SectionProps {
  type: AttributeType
  initialItems: RefItem[]
  onAdd: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function AttributeSection({ type, initialItems, onAdd, onDelete }: SectionProps) {
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const { items, sync, draggingId, onDragStart, onDragOver, onDragEnd } =
    useDragSort<RefItem>(initialItems, async (reordered) => {
      try { await reorderAttributes(reordered.map((a, i) => ({ id: a.id, sort_order: i * 10 }))) } catch { /* non-critical */ }
    })

  useEffect(() => { sync(initialItems) }, [initialItems])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setAddError(null)
    setSubmitting(true)
    try {
      await onAdd(trimmed)
      setNewName('')
    } catch {
      setAddError('Failed to add. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.section}>
      <h2>{ATTRIBUTE_LABELS[type]}</h2>
      {addError && <p role="alert" className={styles.error}>{addError}</p>}

      <form onSubmit={(e) => void handleAdd(e)} className={styles.form}>
        <Input
          label={`New ${ATTRIBUTE_LABELS[type]}`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`e.g. ${type === 'fit' ? 'Slim Fit' : type === 'material' ? 'Cotton' : type === 'model' ? 'Classic' : 'Handbag'}`}
          required
        />
        <Button type="submit" loading={submitting}><Plus size={13} strokeWidth={1.5} aria-hidden="true" /> Add</Button>
      </form>

      {items.length === 0 ? (
        <p className={styles.empty}>No {ATTRIBUTE_LABELS[type].toLowerCase()} options yet.</p>
      ) : (
        <table className={styles.table}>
          <colgroup>
            <col className={styles.colDrag} />
            <col className={styles.colName} />
            <col className={styles.colActions} />
          </colgroup>
          <thead>
            <tr>
              <th />
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id}
                className={draggingId === item.id ? styles.rowDragging : undefined}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDragEnd}
              >
                <td className={styles.dragCell}><DragIcon /></td>
                <td>{item.name}</td>
                <td className={styles.actionsCell}>
                  <button type="button" className={styles.iconBtnDanger} onClick={() => void onDelete(item.id)} title="Delete" aria-label="Delete">
                    <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export function AttributesPage() {
  const confirm = useConfirm()
  const [data, setData] = useState<Record<AttributeType, RefItem[]>>({
    model: [], fit: [], material: [], accessory_style: [],
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const results = await Promise.all(TYPES.map((t) => getRefAttributes(t).then((items) => [t, items] as const)))
      setData(Object.fromEntries(results) as Record<AttributeType, RefItem[]>)
    } catch {
      setLoadError('Failed to load attributes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleAdd = (type: AttributeType) => async (name: string) => {
    const item = await addRefAttribute(type, name)
    setData((prev) => ({ ...prev, [type]: [...prev[type], item] }))
  }

  const handleDelete = (type: AttributeType) => async (id: string) => {
    const label = ATTRIBUTE_LABELS[type].replace(/s$/, '')
    const ok = await confirm(`Delete this ${label.toLowerCase()}?`, { title: `Delete ${label}`, confirmLabel: 'Delete', variant: 'danger' })
    if (!ok) return
    await deleteRefAttribute(id)
    setData((prev) => ({ ...prev, [type]: prev[type].filter((a) => a.id !== id) }))
  }

  if (loading) return <PageLoader />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  return (
    <div className={styles.page}>
      <h1>Attributes</h1>
      {TYPES.map((type) => (
        <AttributeSection
          key={type}
          type={type}
          initialItems={data[type]}
          onAdd={handleAdd(type)}
          onDelete={handleDelete(type)}
        />
      ))}
    </div>
  )
}
