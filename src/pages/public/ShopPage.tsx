import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts } from '../../api/products'
import { getCategories } from '../../api/categories'
import { ProductCard } from '../../components/ui/ProductCard'
import { Spinner } from '../../components/ui/Spinner'
import type { Category, PaginatedResponse, Product } from '../../types'
import styles from './ShopPage.module.css'

export function ShopPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const page = parseInt(params.get('page') ?? '1', 10)
  const category = params.get('category') ?? undefined

  useEffect(() => {
    void getCategories().then(setCategories)
  }, [])

  useEffect(() => {
    setLoading(true)
    void getProducts({ page, category, page_size: 12 })
      .then(setData)
      .finally(() => setLoading(false))
  }, [page, category])

  if (loading) return <Spinner />

  return (
    <div className={styles.page}>
      <aside className={styles.filters}>
        <button onClick={() => setParams({})}>All</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setParams({ category: c.slug })}>{c.name}</button>
        ))}
      </aside>
      <section>
        {data?.items.length === 0 && <p>No products found.</p>}
        <div className={styles.grid}>
          {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        {data && data.total > data.page_size && (
          <div className={styles.pagination}>
            {page > 1 && <button onClick={() => setParams({ page: String(page - 1) })}>Prev</button>}
            <span>Page {page}</span>
            {data.total > page * data.page_size && <button onClick={() => setParams({ page: String(page + 1) })}>Next</button>}
          </div>
        )}
      </section>
    </div>
  )
}
