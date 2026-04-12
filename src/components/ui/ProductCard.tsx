import { Link } from 'react-router-dom'
import type { Product } from '../../types'
import styles from './ProductCard.module.css'

interface Props { readonly product: Product }

export function ProductCard({ product }: Props) {
  const thumb = product.images.find((i) => i.is_primary)?.thumbnail_url ?? 'https://placehold.co/300x300'
  return (
    <Link to={`/shop/${product.slug}`} className={styles.card}>
      <img src={thumb} alt={product.name} className={styles.image} />
      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>€{product.price.toFixed(2)}</p>
      </div>
    </Link>
  )
}
