import { useState } from 'react'
import type { ProductImage } from '../../types'
import styles from './ImageGallery.module.css'

interface Props { readonly images: ProductImage[]; readonly alt?: string }

export function ImageGallery({ images, alt }: Props) {
  const primary = images.find((i) => i.is_primary) ?? images[0]
  const [active, setActive] = useState<ProductImage | undefined>(primary)
  if (!active) return null
  return (
    <div className={styles.gallery}>
      <img src={active.url} alt={alt ?? ''} className={styles.main} />
      <div className={styles.thumbs}>
        {images.map((img, index) => (
          <button key={img.id} onClick={() => setActive(img)} aria-label={`View image ${index + 1}`} className={`${styles.thumb} ${active.id === img.id ? styles.active : ''}`}>
            <img src={img.thumbnail_url} alt="" />
          </button>
        ))}
      </div>
    </div>
  )
}
