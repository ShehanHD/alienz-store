import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import { Slider, Pagination, Box, Stack, Grid, Divider, Chips } from '@shehandon/vcs-ui'
import { getProducts, getProductFilters } from '../../api/products'
import type { ProductFilterColor } from '../../api/products'
import { getCategories } from '../../api/categories'
import { ProductCard } from '../../components/ui/ProductCard'
import { ProductCardSkeleton } from '../../components/ui/ProductCardSkeleton'
import { Chip } from '../../components/ui/Chip'
import { Button } from '../../components/ui/Button'
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
    <Box className={styles.page}>
      <Stack direction="row" className={styles.toolbar}>
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
              <Stack direction="column" gap="6">

                {/* Category */}
                <Stack direction="column" gap="3">
                  <p className={styles.filterSectionLabel}>Category</p>
                  <Chips
                    mode="single"
                    options={[
                      { value: '', label: 'All' },
                      ...categories.map((c) => ({ value: c.slug, label: c.name })),
                    ]}
                    value={[draft.category ?? '']}
                    onChange={(v) => setDraft((d) => ({ ...d, category: v[0] || undefined }))}
                  />
                </Stack>

                <Divider />

                {/* Price range */}
                <Stack direction="column" gap="3">
                  <p className={styles.filterSectionLabel}>Price Range</p>
                  <Stack direction="column" gap="4">
                    <Slider
                      label="Min Price"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={10}
                      value={draft.minPrice}
                      onChange={(v) => setDraft((d) => ({ ...d, minPrice: Math.min(v, d.maxPrice) }))}
                      showValue
                      formatValue={(v) => `€${v}`}
                    />
                    <Slider
                      label="Max Price"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={10}
                      value={draft.maxPrice}
                      onChange={(v) => setDraft((d) => ({ ...d, maxPrice: Math.max(v, d.minPrice) }))}
                      showValue
                      formatValue={(v) => `€${v}`}
                    />
                  </Stack>
                </Stack>

                {/* Colour */}
                {availableColors.length > 0 && (
                  <>
                    <Divider />
                    <Stack direction="column" gap="3">
                      <p className={styles.filterSectionLabel}>Colour</p>
                      <Stack direction="row" wrap gap="2">
                        {availableColors.map(({ name, hex }) => (
                          <Chip
                            key={name}
                            selected={draft.colors.includes(name)}
                            onClick={() => setDraft((d) => ({ ...d, colors: toggle(d.colors, name) }))}
                            title={name}
                            icon={
                              <span
                                className={styles.colorSwatch}
                                style={{ background: hex, border: hex === '#ffffff' ? '1px solid var(--border)' : 'none' }}
                              />
                            }
                          >
                            {name}
                          </Chip>
                        ))}
                      </Stack>
                    </Stack>
                  </>
                )}

                {/* Size */}
                {availableSizes.length > 0 && (
                  <>
                    <Divider />
                    <Stack direction="column" gap="3">
                      <p className={styles.filterSectionLabel}>Size</p>
                      <Chips
                        mode="multiple"
                        options={availableSizes}
                        value={draft.sizes}
                        onChange={(v) => setDraft((d) => ({ ...d, sizes: v }))}
                      />
                    </Stack>
                  </>
                )}

                {/* Upcoming */}
                {(['Model', 'Fit', 'Material', 'Accessory Style'] as const).map((label) => (
                  <Stack key={label} direction="column" gap="3" className={styles.filterSectionDisabled}>
                    <p className={styles.filterSectionLabel}>{label}</p>
                    <p className={styles.filterComingSoon}>Coming soon</p>
                  </Stack>
                ))}

                <Stack direction="row" gap="3" className={styles.filterActions}>
                  <Button variant="secondary" onClick={clearFilters}>Clear</Button>
                  <Button variant="primary" onClick={applyFilters}>Apply</Button>
                </Stack>
              </Stack>
            </div>
          )}
        </div>
      </Stack>

      {loading && (
        <Grid minColWidth="240px" gap="6">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </Grid>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {!loading && !error && (
        <>
          {data?.items.length === 0 && <p className={styles.empty}>No products found.</p>}
          <Grid minColWidth="240px" gap="6">
            {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </Grid>
          {data && data.total > data.page_size && (
            <Stack direction="row" justify="center" className={styles.pagination}>
              <Pagination
                page={page}
                totalPages={Math.ceil(data.total / data.page_size)}
                onChange={(p) => setParams({ ...Object.fromEntries(params), page: String(p) })}
              />
            </Stack>
          )}
        </>
      )}
    </Box>
  )
}
