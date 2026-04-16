import { useCallback, useEffect, useState } from 'react'
import {
  getRefColors, addRefColor, deleteRefColor, reorderColors,
  getRefSizes, addRefSize, deleteRefSize, reorderSizes,
} from '../../api/refData'
import type { RefItem } from '../../api/refData'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/PageLoader'
import { useDragSort } from '../../hooks/useDragSort'
import { useConfirm } from '../../contexts/ConfirmContext'
import { Trash2, Plus } from 'lucide-react'
import styles from './ColorsAndSizesPage.module.css'

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

// ── Colors section ─────────────────────────────────────────────────────────

interface ColorSectionProps {
  readonly initialItems: RefItem[]
  readonly onAdd: (name: string, hex: string) => Promise<void>
  readonly onDelete: (id: string) => Promise<void>
}

function ColorsSection({ initialItems, onAdd, onDelete }: ColorSectionProps) {
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#000000')
  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const { items, sync, draggingId, onDragStart, onDragOver, onDragEnd } =
    useDragSort<RefItem>(initialItems, async (reordered) => {
      try { await reorderColors(reordered.map((c, i) => ({ id: c.id, sort_order: i * 10 }))) } catch { /* non-critical */ }
    })

  useEffect(() => { sync(initialItems) }, [initialItems])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setAddError(null)
    setSubmitting(true)
    try {
      await onAdd(trimmed, hex)
      setName('')
      setHex('#000000')
    } catch {
      setAddError('Failed to add color.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.section}>
      <h2>Colors</h2>
      {addError && <p role="alert" className={styles.error}>{addError}</p>}

      <form onSubmit={(e) => void handleAdd(e)} className={styles.colorForm}>
        <div className={styles.colorPickerWrap}>
          <label className={styles.colorPickerLabel}>Colour</label>
          <div className={styles.colorPickerRow}>
            <input type="color" className={styles.colorPicker} value={hex} onChange={(e) => setHex(e.target.value)} aria-label="Pick colour" />
            <span className={styles.colorHex}>{hex}</span>
          </div>
        </div>
        <div className={styles.colorNameWrap}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Midnight Black" required />
        </div>
        <div className={styles.colorAddBtn}>
          <Button type="submit" loading={submitting}><Plus size={13} strokeWidth={1.5} aria-hidden="true" /> Add</Button>
        </div>
      </form>

      {items.length === 0 ? (
        <p className={styles.empty}>No colors added yet.</p>
      ) : (
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <colgroup>
            <col className={styles.colDrag} />
            <col className={styles.colSwatch} />
            <col className={styles.colName} />
            <col className={styles.colHex} />
            <col className={styles.colActions} />
          </colgroup>
          <thead>
            <tr>
              <th />
              <th />
              <th>Name</th>
              <th>Hex</th>
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
                <td>
                  <span className={styles.swatch} style={{ background: item.hex ?? '#ccc' }} />
                </td>
                <td>{item.name}</td>
                <td className={styles.hexCell}>{item.hex}</td>
                <td className={styles.actionsCell}>
                  <button type="button" className={styles.iconBtnDanger} onClick={() => void onDelete(item.id)} title="Delete" aria-label="Delete">
                    <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </section>
  )
}

// ── Sizes section ──────────────────────────────────────────────────────────

interface SizeSectionProps {
  readonly initialItems: RefItem[]
  readonly onAdd: (name: string) => Promise<void>
  readonly onDelete: (id: string) => Promise<void>
}

function SizesSection({ initialItems, onAdd, onDelete }: SizeSectionProps) {
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const { items, sync, draggingId, onDragStart, onDragOver, onDragEnd } =
    useDragSort<RefItem>(initialItems, async (reordered) => {
      try { await reorderSizes(reordered.map((s, i) => ({ id: s.id, sort_order: i * 10 }))) } catch { /* non-critical */ }
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
      setAddError('Failed to add size.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.section}>
      <h2>Sizes</h2>
      {addError && <p role="alert" className={styles.error}>{addError}</p>}

      <form onSubmit={(e) => void handleAdd(e)} className={styles.form}>
        <Input label="New size" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. M, 42, One Size" required />
        <Button type="submit" loading={submitting}><Plus size={13} strokeWidth={1.5} aria-hidden="true" /> Add</Button>
      </form>

      {items.length === 0 ? (
        <p className={styles.empty}>No sizes added yet.</p>
      ) : (
        <div className={styles.tableWrap}>
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
        </div>
      )}
    </section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export function ColorsAndSizesPage() {
  const confirm = useConfirm()
  const [colors, setColors] = useState<RefItem[]>([])
  const [sizes, setSizes] = useState<RefItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([getRefColors(), getRefSizes()])
      .then(([c, s]) => { setColors(c); setSizes(s) })
      .catch(() => setLoadError('Failed to load data.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAddColor(name: string, hex: string) {
    const item = await addRefColor(name, hex)
    setColors((prev) => [...prev, item])
  }

  async function handleDeleteColor(id: string) {
    const ok = await confirm('Delete this color?', { title: 'Delete Color', confirmLabel: 'Delete', variant: 'danger' })
    if (!ok) return
    await deleteRefColor(id)
    setColors((prev) => prev.filter((c) => c.id !== id))
  }

  async function handleAddSize(name: string) {
    const item = await addRefSize(name)
    setSizes((prev) => [...prev, item])
  }

  async function handleDeleteSize(id: string) {
    const ok = await confirm('Delete this size?', { title: 'Delete Size', confirmLabel: 'Delete', variant: 'danger' })
    if (!ok) return
    await deleteRefSize(id)
    setSizes((prev) => prev.filter((s) => s.id !== id))
  }

  if (loading) return <PageLoader />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  return (
    <div className={styles.page}>
      <h1>Colors &amp; Sizes</h1>
      <ColorsSection initialItems={colors} onAdd={handleAddColor} onDelete={handleDeleteColor} />
      <SizesSection initialItems={sizes} onAdd={handleAddSize} onDelete={handleDeleteSize} />
    </div>
  )
}
