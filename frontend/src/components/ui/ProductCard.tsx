import { Link } from 'react-router-dom'
import { Card, CardMedia, CardBody, AspectRatio, Stack } from '@shehandon/vcs-ui'
import type { Product } from '../../types'
import { FadeImage } from './FadeImage'
import styles from './ProductCard.module.css'

interface Props { readonly product: Product }

export function ProductCard({ product }: Props) {
  const thumb = product.images.find((i) => i.is_primary)?.thumbnail_url ?? 'https://placehold.co/300x400'
  return (
    <Link to={`/shop/${product.slug}`} className={styles.link}>
      <Card padding="none" className={styles.card}>
        <CardMedia className={styles.imageWrapper}>
          <AspectRatio ratio="3 / 4">
            <FadeImage src={thumb} alt={product.name} className={styles.image} />
          </AspectRatio>
        </CardMedia>
        <CardBody>
          <Stack direction="row" justify="between" align="baseline" gap="4">
            <h3 className={styles.name}>{product.name}</h3>
            <p className={styles.price}>€{product.price.toFixed(2)}</p>
          </Stack>
        </CardBody>
      </Card>
    </Link>
  )
}
