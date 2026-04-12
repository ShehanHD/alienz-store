import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../../api/products'
import { ProductCard } from '../../components/ui/ProductCard'
import type { Product } from '../../types'
import styles from './HomePage.module.css'

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([])

  useEffect(() => {
    void getProducts({ page: 1, page_size: 4 }).then((r) => setFeatured(r.items))
  }, [])

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1>New Arrivals</h1>
        <Link to="/shop" className={styles.cta}>Shop Now</Link>
      </section>
      {featured.length > 0 && (
        <section className={styles.featured}>
          <h2>Featured</h2>
          <div className={styles.grid}>
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
