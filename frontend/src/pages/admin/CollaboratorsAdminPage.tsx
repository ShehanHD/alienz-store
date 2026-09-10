import { useCallback, useEffect, useState } from 'react'
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
import { Input } from '../../components/ui/Input'
import { Dialog } from '../../components/ui/Dialog'
import { PageLoader } from '../../components/ui/PageLoader'
import { useDragSort } from '../../hooks/useDragSort'
import { FileUpload, Switch, useToast, Box, Stack, Chips } from '@shehandon/vcs-ui'
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

  async function handleImageChange(files: File[]) {
    const file = files[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadCollaboratorImage(file)
      setForm((f) => ({ ...f, image_url: url }))
    } catch {
      toast({ title: 'Failed to upload image. Please try again.', variant: 'danger' })
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingId) {
        const updated = await updateCollaborator(editingId, form)
        toast({ title: 'Collaborator updated.', variant: 'success' })
        sync(collaborators.map((c) => c.id === editingId ? updated : c))
      } else {
        const created = await createCollaborator({ ...form, display_order: collaborators.length * 10 })
        toast({ title: 'Collaborator added.', variant: 'success' })
        sync([...collaborators, created])
      }
      closeDialog()
    } catch {
      toast({ title: 'Failed to save collaborator. Please try again.', variant: 'danger' })
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
      toast({ title: 'Collaborator deleted.', variant: 'success' })
      sync(collaborators.filter((c) => c.id !== id))
    } catch {
      toast({ title: 'Failed to delete collaborator. Please try again.', variant: 'danger' })
    }
  }

  if (loading) return <PageLoader />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  return (
    <Box px={{ base: '4', md: '8' }} py={{ base: '6', md: '12' }}>
      <Stack direction="row" align="center" justify="between" wrap gap="4" className={styles.pageHeader}>
        <h1 className={styles.title}>Collaborators</h1>
        <Button onClick={openAdd}>
          <Plus size={13} strokeWidth={1.5} aria-hidden="true" /> Add Collaborator
        </Button>
      </Stack>

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
                    <Button
                      variant="secondary"
                      shape="square"
                      size="sm"
                      onClick={() => openEdit(c)}
                      title="Edit"
                      aria-label="Edit collaborator"
                    >
                      <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                    <Button
                      variant="danger"
                      shape="square"
                      size="sm"
                      onClick={() => void handleDelete(c.id)}
                      title="Delete"
                      aria-label="Delete collaborator"
                    >
                      <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                    </Button>
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
        <Stack as="form" direction="column" gap="8" onSubmit={(e) => void handleSubmit(e)}>

          {/* Image */}
          <Stack direction="row" align="start" gap="6">
            <div
              className={styles.imagePreview}
              style={form.image_url ? { backgroundImage: `url(${form.image_url})` } : undefined}
            >
              {!form.image_url && <span className={styles.imagePlaceholder}>No image</span>}
            </div>
            <Stack direction="column" gap="3">
              <FileUpload
                variant="button"
                accept="image/*"
                label={uploading ? 'Uploading…' : form.image_url ? 'Change image' : 'Upload image'}
                disabled={uploading}
                onChange={(files) => void handleImageChange(files)}
              />
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
            </Stack>
          </Stack>

          {/* Fields */}
          <Stack direction="column" gap="4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />

            <Input
              label="Instagram URL"
              type="url"
              value={form.instagram_url}
              onChange={(e) => setForm((f) => ({ ...f, instagram_url: e.target.value }))}
              placeholder="https://instagram.com/username"
              required
            />

            <Stack direction="column" gap="2">
              <span className={styles.label}>Type</span>
              <Chips
                mode="single"
                options={[
                  { value: 'person', label: 'Person' },
                  { value: 'logo', label: 'Logo' },
                ]}
                value={[form.collab_type]}
                onChange={(v) => {
                  if (v[0]) setForm((f) => ({ ...f, collab_type: v[0] as CollabType }))
                }}
              />
            </Stack>

            <Switch
              checked={form.is_featured}
              onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
              label="Featured — show as hero card"
            />
          </Stack>

          <Stack direction="row" gap="3">
            <Button type="submit" loading={submitting}>
              {editingId ? 'Save Changes' : 'Add Collaborator'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeDialog}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Dialog>
    </Box>
  )
}
