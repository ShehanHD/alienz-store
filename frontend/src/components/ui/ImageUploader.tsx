import { useState } from 'react'
import { FileUpload, Stack, Grid, Box } from '@shehandon/vcs-ui'
import { deleteProductImage, setPrimaryImage } from '../../api/admin'
import { useConfirm } from '../../contexts/ConfirmContext'
import { Button } from './Button'
import type { ProductImage } from '../../types'
import styles from './ImageUploader.module.css'

interface Props {
  images: ProductImage[]
  pendingFiles: File[]
  maxImages: number
  maxUploadMb: number
  onImagesChange: (images: ProductImage[]) => void
  onPendingChange: (files: File[]) => void
  /** If provided, delete/primary actions are live (edit mode). Omit for new product. */
  productId?: string
}

export function ImageUploader({
  images, pendingFiles, maxImages, maxUploadMb,
  onImagesChange, onPendingChange, productId,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  // Remounts FileUpload after each pick so its own internal file list clears —
  // we keep pending files in our own thumbnail grid below instead.
  const [uploadKey, setUploadKey] = useState(0)
  const confirm = useConfirm()

  const totalCount = images.length + pendingFiles.length
  const remaining = maxImages - totalCount
  const canAdd = remaining > 0

  function handleSelect(files: File[]) {
    setError(null)
    if (files.length === 0) return
    onPendingChange([...pendingFiles, ...files])
    setUploadKey((k) => k + 1)
  }

  function removePending(index: number) {
    onPendingChange(pendingFiles.filter((_, i) => i !== index))
  }

  async function handleDelete(imageId: string) {
    if (!productId) return
    const ok = await confirm('Delete this image?', { confirmLabel: 'Delete', variant: 'danger' })
    if (!ok) return
    setError(null)
    try {
      await deleteProductImage(productId, imageId)
      onImagesChange(images.filter((img) => img.id !== imageId))
    } catch {
      setError('Failed to delete image.')
    }
  }

  async function handleSetPrimary(imageId: string) {
    if (!productId) return
    setError(null)
    try {
      await setPrimaryImage(productId, imageId)
      onImagesChange(images.map((img) => ({ ...img, is_primary: img.id === imageId })))
    } catch {
      setError('Failed to set primary image.')
    }
  }

  return (
    <Stack direction="column" gap="4">
      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* Existing uploaded images */}
      {images.length > 0 && (
        <Grid minColWidth="100px" gap="3">
          {images.map((img) => (
            <Box key={img.id} className={`${styles.cell} ${img.is_primary ? styles.cellPrimary : ''}`}>
              <img src={img.thumbnail_url} alt="" className={styles.thumb} />
              <Stack direction="row" align="center" gap="1" className={styles.cellActions}>
                {img.is_primary
                  ? <span className={styles.primaryBadge}>Primary</span>
                  : productId
                    ? <Button variant="secondary" shape="square" size="sm" onClick={() => void handleSetPrimary(img.id)} title="Set as primary">★</Button>
                    : null
                }
                {productId && (
                  <Button variant="danger" shape="square" size="sm" onClick={() => void handleDelete(img.id)} title="Delete">✕</Button>
                )}
              </Stack>
            </Box>
          ))}
        </Grid>
      )}

      {/* Pending (queued) files — shown before upload */}
      {pendingFiles.length > 0 && (
        <Grid minColWidth="100px" gap="3">
          {pendingFiles.map((file, i) => (
            <Box key={i} className={styles.pendingCell}>
              <img src={URL.createObjectURL(file)} alt={file.name} className={styles.thumb} />
              <Stack direction="row" align="center" gap="1" className={styles.cellActions}>
                <span className={styles.pendingBadge}>Queued</span>
                <Button variant="danger" shape="square" size="sm" onClick={() => removePending(i)} title="Remove">✕</Button>
              </Stack>
            </Box>
          ))}
        </Grid>
      )}

      {/* Counter + add zone */}
      <Stack direction="row" align="center" gap="4" className={styles.footer}>
        <span className={styles.counter}>{totalCount} / {maxImages}</span>
        {canAdd ? (
          <FileUpload
            key={uploadKey}
            variant="zone"
            accept="image/jpeg,image/png,image/webp"
            multiple={remaining > 1}
            maxFiles={remaining}
            maxSize={maxUploadMb * 1024 * 1024}
            onChange={handleSelect}
            className={styles.fileUploadZone}
          />
        ) : (
          <span className={styles.limitNote}>Limit reached</span>
        )}
      </Stack>
    </Stack>
  )
}
