import { useRef, useState } from 'react'
import { deleteProductImage, setPrimaryImage } from '../../api/admin'
import { useConfirm } from '../../contexts/ConfirmContext'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const confirm = useConfirm()

  const totalCount = images.length + pendingFiles.length
  const remaining = maxImages - totalCount
  const canAdd = remaining > 0

  function handleSelect(fileList: FileList | null) {
    if (!fileList) return
    setError(null)
    const incoming = Array.from(fileList).slice(0, remaining)
    const oversized = incoming.filter((f) => f.size > maxUploadMb * 1024 * 1024)
    if (oversized.length) {
      setError(`${oversized.map((f) => `"${f.name}"`).join(', ')} exceed${oversized.length === 1 ? 's' : ''} the ${maxUploadMb}MB limit.`)
    }
    const valid = incoming.filter((f) => f.size <= maxUploadMb * 1024 * 1024)
    if (valid.length) onPendingChange([...pendingFiles, ...valid])
    if (inputRef.current) inputRef.current.value = ''
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
    <div className={styles.wrapper}>
      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* Existing uploaded images */}
      {images.length > 0 && (
        <div className={styles.grid}>
          {images.map((img) => (
            <div key={img.id} className={`${styles.cell} ${img.is_primary ? styles.cellPrimary : ''}`}>
              <img src={img.thumbnail_url} alt="" className={styles.thumb} />
              <div className={styles.cellActions}>
                {img.is_primary
                  ? <span className={styles.primaryBadge}>Primary</span>
                  : productId
                    ? <button type="button" className={styles.primaryBtn} onClick={() => void handleSetPrimary(img.id)} title="Set as primary">★</button>
                    : null
                }
                {productId && (
                  <button type="button" className={styles.deleteBtn} onClick={() => void handleDelete(img.id)} title="Delete">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending (queued) files — shown before upload */}
      {pendingFiles.length > 0 && (
        <div className={styles.pendingGrid}>
          {pendingFiles.map((file, i) => (
            <div key={i} className={styles.pendingCell}>
              <img src={URL.createObjectURL(file)} alt={file.name} className={styles.thumb} />
              <div className={styles.cellActions}>
                <span className={styles.pendingBadge}>Queued</span>
                <button type="button" className={styles.deleteBtn} onClick={() => removePending(i)} title="Remove">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Counter + add button */}
      <div className={styles.footer}>
        <span className={styles.counter}>{totalCount} / {maxImages}</span>
        {canAdd ? (
          <>
            <button type="button" className={styles.uploadBtn} onClick={() => inputRef.current?.click()}>
              Choose Images
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={remaining > 1}
              className={styles.hiddenInput}
              onChange={(e) => handleSelect(e.target.files)}
            />
          </>
        ) : (
          <span className={styles.limitNote}>Limit reached</span>
        )}
      </div>
    </div>
  )
}
