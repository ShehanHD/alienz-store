import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import { getProducts, getProductFilters } from '../../api/products'
import type { ProductFilterColor } from '../../api/products'
import { getCategories } from '../../api/categories'
import { ProductCard } from '../../components/ui/ProductCard'
import { PriceRangeSlider } from '../../components/ui/PriceRangeSlider'
import { Spinner } from '../../components/ui/Spinner'
import type { Category, PaginatedResponse, Product } from '../../types'
import styles from './ShopPage.module.css'

const PRICE_MIN = 0
const PRICE_MAX = 1000


interface Filters {
  category?: string
  minPrice: number
  maxPrice: number
  colors: string[]
  sizes: string[]
}

const EMPTY_FILTERS: Filters = {
  category: undefined,
  minPrice: PRICE_MIN,
  maxPrice: PRICE_MAX,
  colors: [],
  sizes: [],
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

export function ShopPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS)
  const [availableColors, setAvailableColors] = useState<ProductFilterColor[]>([])
  const [availableSizes, setAvailableSizes] = useState<string[]>([])
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const page = parseInt(params.get('page') ?? '1', 10)

  const active: Filters = {
    category: params.get('category') ?? undefined,
    minPrice: params.get('min_price') ? Number(params.get('min_price')) : PRICE_MIN,
    maxPrice: params.get('max_price') ? Number(params.get('max_price')) : PRICE_MAX,
    colors: params.get('color') ? params.get('color')!.split(',') : [],
    sizes: params.get('size') ? params.get('size')!.split(',') : [],
  }

  const activeCount = [
    active.category,
    active.minPrice > PRICE_MIN || active.maxPrice < PRICE_MAX ? true : undefined,
    active.colors.length ? true : undefined,
    active.sizes.length ? true : undefined,
  ].filter(Boolean).length

  useEffect(() => {
    void getCategories().then(setCategories)
    void getProductFilters().then((f) => {
      setAvailableColors(f.colors)
      setAvailableSizes(f.sizes)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    getProducts({
      page,
      page_size: 12,
      category: active.category,
      min_price: active.minPrice > PRICE_MIN ? active.minPrice : undefined,
      max_price: active.maxPrice < PRICE_MAX ? active.maxPrice : undefined,
      color: active.colors.length ? active.colors.join(',') : undefined,
      size: active.sizes.length ? active.sizes.join(',') : undefined,
    })
      .then(setData)
      .catch(() => setError('Failed to load products. Please try again.'))
      .finally(() => setLoading(false))
  }, [params, page])

  useEffect(() => { if (filterOpen) setDraft(active) }, [filterOpen])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dialogRef.current && !dialogRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const applyFilters = () => {
    const next: Record<string, string> = {}
    if (draft.category) next.category = draft.category
    if (draft.minPrice > PRICE_MIN) next.min_price = String(draft.minPrice)
    if (draft.maxPrice < PRICE_MAX) next.max_price = String(draft.maxPrice)
    if (draft.colors.length) next.color = draft.colors.join(',')
    if (draft.sizes.length) next.size = draft.sizes.join(',')
    setParams(next)
    setFilterOpen(false)
  }

  const clearFilters = () => { setDraft(EMPTY_FILTERS); setParams({}); setFilterOpen(false) }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.filterWrap}>
          <button
            ref={triggerRef}
            className={`${styles.filterBtn} ${filterOpen ? styles.filterBtnOpen : ''}`}
            onClick={() => setFilterOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={filterOpen}
          >
            <SlidersHorizontal size={13} strokeWidth={1.5} aria-hidden="true" />
            <span>Filter</span>
            {activeCount > 0 && <span className={styles.filterBadge}>{activeCount}</span>}
            <ChevronDown size={12} strokeWidth={1.5} className={`${styles.chevron} ${filterOpen ? styles.chevronUp : ''}`} aria-hidden="true" />
          </button>

          {filterOpen && (
            <div ref={dialogRef} className={styles.filterDialog} role="dialog" aria-label="Filters">

              {/* Category */}
              <section className={styles.filterSection}>
                <p className={styles.filterSectionLabel}>Category</p>
                <div className={styles.chips}>
                  <button className={`${styles.chip} ${!draft.category ? styles.chipActive : ''}`} onClick={() => setDraft((d) => ({ ...d, category: undefined }))}>All</button>
                  {categories.map((c) => (
                    <button key={c.id} className={`${styles.chip} ${draft.category === c.slug ? styles.chipActive : ''}`} onClick={() => setDraft((d) => ({ ...d, category: c.slug }))}>{c.name}</button>
                  ))}
                </div>
              </section>

              <div className={styles.divider} />

              {/* Price range */}
              <section className={styles.filterSection}>
                <p className={styles.filterSectionLabel}>Price Range</p>
                <PriceRangeSlider
                  min={PRICE_MIN} max={PRICE_MAX}
                  valueMin={draft.minPrice} valueMax={draft.maxPrice}
                  onChange={(min, max) => setDraft((d) => ({ ...d, minPrice: min, maxPrice: max }))}
                />
              </section>

              <div className={styles.divider} />

              {/* Colour */}
              {availableColors.length > 0 && (
                <>
                  <section className={styles.filterSection}>
                    <p className={styles.filterSectionLabel}>Colour</p>
                    <div className={styles.colorGrid}>
                      {availableColors.map(({ name, hex }) => {
                        const isActive = draft.colors.includes(name)
                        return (
                          <button
                            key={name}
                            className={`${styles.colorChip} ${isActive ? styles.colorChipActive : ''}`}
                            onClick={() => setDraft((d) => ({ ...d, colors: toggle(d.colors, name) }))}
                            title={name}
                            aria-label={name}
                            aria-pressed={isActive}
                          >
                            <span
                              className={styles.colorSwatch}
                              style={{ background: hex, border: hex === '#ffffff' ? '1px solid #e8e8e8' : 'none' }}
                            />
                            <span className={styles.colorLabel}>{name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                  <div className={styles.divider} />
                </>
              )}

              {/* Size */}
              {availableSizes.length > 0 && (
                <>
                  <section className={styles.filterSection}>
                    <p className={styles.filterSectionLabel}>Size</p>
                    <div className={styles.chips}>
                      {availableSizes.map((size) => (
                        <button
                          key={size}
                          className={`${styles.chip} ${draft.sizes.includes(size) ? styles.chipActive : ''}`}
                          onClick={() => setDraft((d) => ({ ...d, sizes: toggle(d.sizes, size) }))}
                          aria-pressed={draft.sizes.includes(size)}
                        >{size}</button>
                      ))}
                    </div>
                  </section>
                  <div className={styles.divider} />
                </>
              )}

              {/* Upcoming */}
              {(['Model', 'Fit', 'Material', 'Accessory Style'] as const).map((label) => (
                <section key={label} className={`${styles.filterSection} ${styles.filterSectionDisabled}`}>
                  <p className={styles.filterSectionLabel}>{label}</p>
                  <p className={styles.filterComingSoon}>Coming soon</p>
                </section>
              ))}

              <div className={styles.filterActions}>
                <button className={styles.clearBtn} onClick={clearFilters}>Clear</button>
                <button className={styles.applyBtn} onClick={applyFilters}>Apply</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && <div className={styles.loadingArea}><Spinner /></div>}
      {error && <p className={styles.error}>{error}</p>}
      {!loading && !error && (
        <>
          {data?.items.length === 0 && <p className={styles.empty}>No products found.</p>}
          <div className={styles.grid}>
            {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {data && data.total > data.page_size && (
            <div className={styles.pagination}>
              {page > 1 && <button onClick={() => setParams({ ...Object.fromEntries(params), page: String(page - 1) })}>Prev</button>}
              <span>Page {page}</span>
              {data.total > page * data.page_size && <button onClick={() => setParams({ ...Object.fromEntries(params), page: String(page + 1) })}>Next</button>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
