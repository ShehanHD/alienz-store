import { useState } from 'react'
import { Stack, AspectRatio } from '@shehandon/vcs-ui'
import type { ProductImage } from '../../types'
import { FadeImage } from './FadeImage'
import styles from './ImageGallery.module.css'

interface Props { readonly images: ProductImage[]; readonly alt?: string }

export function ImageGallery({ images, alt }: Props) {
  const primary = images.find((i) => i.is_primary) ?? images[0]
  const [active, setActive] = useState<ProductImage | undefined>(primary)
  if (!active) return null
  return (
    <Stack direction="column" gap="3">
      <AspectRatio ratio="3 / 4" className={styles.mainWrap}>
        <FadeImage key={active.id} src={active.url} alt={alt ?? ''} className={styles.main} />
      </AspectRatio>
      <Stack direction="row" gap="2" wrap>
        {images.map((img, index) => (
          <button key={img.id} onClick={() => setActive(img)} aria-label={`View image ${index + 1}`} className={`${styles.thumb} ${active.id === img.id ? styles.active : ''}`}>
            <FadeImage src={img.thumbnail_url} alt="" />
          </button>
        ))}
      </Stack>
    </Stack>
  )
}
