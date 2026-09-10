import { Card, CardMedia, CardBody, Skeleton, AspectRatio, Stack } from '@shehandon/vcs-ui'
import cardStyles from './ProductCard.module.css'
import styles from './ProductCardSkeleton.module.css'

export function ProductCardSkeleton() {
  return (
    <Card padding="none" className={cardStyles.card} aria-hidden="true">
      <CardMedia className={cardStyles.imageWrapper}>
        <AspectRatio ratio="3 / 4">
          <Skeleton variant="rect" animation="shimmer" className={cardStyles.image} />
        </AspectRatio>
      </CardMedia>
      <CardBody>
        <Stack direction="row" justify="between" align="baseline" gap="4">
          <Skeleton variant="text" animation="shimmer" className={styles.name} />
          <Skeleton variant="text" animation="shimmer" className={styles.price} />
        </Stack>
      </CardBody>
    </Card>
  )
}
