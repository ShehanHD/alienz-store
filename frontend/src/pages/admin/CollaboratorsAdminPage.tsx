import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash2, Pencil, Plus, X } from 'lucide-react'
import {
  getCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  reorderCollaborators,
  uploadCollaboratorImage,
} from '../../api/collaborators'
import type { CollaboratorPayload } from '../../api/collaborators'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { PageLoader } from '../../components/ui/PageLoader'
import { useDragSort } from '../../hooks/useDragSort'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import type { Collaborator, CollabType } from '../../types'
import styles from './CollaboratorsAdminPage.module.css'

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

const EMPTY_FORM: CollaboratorPayload = {
  name: '',
  instagram_url: '',
  image_url: null,
  is_featured: false,
  display_order: 0,
  collab_type: 'person',
}

export function CollaboratorsAdminPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<CollaboratorPayload>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const confirm = useConfirm()

  const { items: collaborators, sync, draggingId, onDragStart, onDragOver, onDragEnd } =
    useDragSort<Collaborator>([], async (reordered) => {
      try {
        await reorderCollaborators(reordered.map((c, i) => ({ id: c.id, display_order: i * 10 })))
      } catch { /* non-critical */ }
    })

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getCollaborators()
      .then(sync)
      .catch(() => setLoadError('Failed to load collaborators. Please try again.'))
      .finally(() => setLoading(false))
  }, [sync])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(c: Collaborator) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      instagram_url: c.instagram_url,
      image_url: c.image_url,
      is_featured: c.is_featured,
      display_order: c.display_order,
      collab_type: c.collab_type,
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadCollaboratorImage(file)
      setForm((f) => ({ ...f, image_url: url }))
    } catch {
      toast('Failed to upload image. Please try again.', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingId) {
        const updated = await updateCollaborator(editingId, form)
        toast('Collaborator updated.', 'success')
        sync(collaborators.map((c) => c.id === editingId ? updated : c))
      } else {
        const created = await createCollaborator({ ...form, display_order: collaborators.length * 10 })
        toast('Collaborator added.', 'success')
        sync([...collaborators, created])
      }
      closeDialog()
    } catch {
      toast('Failed to save collaborator. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm('Delete this collaborator?', {
      title: 'Delete Collaborator',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteCollaborator(id)
      toast('Collaborator deleted.', 'success')
      sync(collaborators.filter((c) => c.id !== id))
    } catch {
      toast('Failed to delete collaborator. Please try again.', 'error')
    }
  }

  if (loading) return <PageLoader />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Collaborators</h1>
        <Button onClick={openAdd}>
          <Plus size={13} strokeWidth={1.5} aria-hidden="true" /> Add Collaborator
        </Button>
      </div>

      {collaborators.length === 0 ? (
        <p className={styles.empty}>No collaborators yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th />
                <th />
                <th>Name</th>
                <th>Type</th>
                <th>Instagram</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {collaborators.map((c, index) => (
                <tr
                  key={c.id}
                  className={draggingId === c.id ? styles.rowDragging : undefined}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDragEnd={onDragEnd}
                >
                  <td className={styles.dragCell}><DragIcon /></td>
                  <td className={styles.thumbCell}>
                    {c.image_url
                      ? <img src={c.image_url} alt={c.name} className={styles.listThumb} />
                      : <div className={styles.listThumbEmpty} />}
                  </td>
                  <td className={styles.nameCell}>{c.name}</td>
                  <td className={styles.typeCell}>{c.collab_type}</td>
                  <td className={styles.instagramCell}>
                    <a href={c.instagram_url} target="_blank" rel="noopener noreferrer" className={styles.instagramLink}>
                      <span aria-hidden="true">@</span>
                      {c.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, '').replace(/\/$/, '') || c.instagram_url}
                    </a>
                  </td>
                  <td>{c.is_featured && <span className={styles.badge}>Featured</span>}</td>
                  <td className={styles.actionsCell}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => openEdit(c)}
                      title="Edit"
                      aria-label="Edit collaborator"
                    >
                      <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      onClick={() => void handleDelete(c.id)}
                      title="Delete"
                      aria-label="Delete collaborator"
                    >
                      <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingId ? 'Edit Collaborator' : 'Add Collaborator'}
      >
        <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>

          {/* Image */}
          <div className={styles.imageSection}>
            <div
              className={styles.imagePreview}
              style={form.image_url ? { backgroundImage: `url(${form.image_url})` } : undefined}
            >
              {!form.image_url && <span className={styles.imagePlaceholder}>No image</span>}
            </div>
            <div className={styles.imageActions}>
              <input
                ref={fileInputRef}
                id="collab-image"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => void handleImageChange(e)}
              />
              <label htmlFor="collab-image" className={styles.imageUploadBtn}>
                {uploading ? 'Uploading…' : form.image_url ? 'Change image' : 'Upload image'}
              </label>
              {form.image_url && (
                <button
                  type="button"
                  className={styles.imageRemoveBtn}
                  onClick={() => setForm((f) => ({ ...f, image_url: null }))}
                  aria-label="Remove image"
                >
                  <X size={12} strokeWidth={1.5} aria-hidden="true" /> Remove
                </button>
              )}
            </div>
          </div>

          {/* Fields */}
          <div className={styles.fields}>
            <div className={styles.field}>
              <label htmlFor="collab-name" className={styles.label}>Name <span className={styles.required}>*</span></label>
              <input
                id="collab-name"
                type="text"
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="collab-url" className={styles.label}>Instagram URL <span className={styles.required}>*</span></label>
              <input
                id="collab-url"
                type="url"
                className={styles.input}
                value={form.instagram_url}
                onChange={(e) => setForm((f) => ({ ...f, instagram_url: e.target.value }))}
                placeholder="https://instagram.com/username"
                required
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Type</span>
              <div className={styles.typeToggle}>
                {(['person', 'logo'] as CollabType[]).map((t) => (
                  <label
                    key={t}
                    className={`${styles.typeOption} ${form.collab_type === t ? styles.typeOptionActive : ''}`}
                  >
                    <input
                      type="radio"
                      name="collab_type"
                      value={t}
                      checked={form.collab_type === t}
                      onChange={() => setForm((f) => ({ ...f, collab_type: t }))}
                      style={{ display: 'none' }}
                    />
                    {t === 'person' ? 'Person' : 'Logo'}
                  </label>
                ))}
              </div>
            </div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
              />
              <span>Featured — show as hero card</span>
            </label>
          </div>

          <div className={styles.formFooter}>
            <Button type="submit" loading={submitting}>
              {editingId ? 'Save Changes' : 'Add Collaborator'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeDialog}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
