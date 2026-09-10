import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Eye, EyeOff, Star, Plus } from 'lucide-react'
import { DataGrid, Pagination, useToast, Box, Stack } from '@shehandon/vcs-ui'
import type { ColumnDef } from '@shehandon/vcs-ui'

import { getAdminProducts, deleteProduct } from '../../api/admin'
import { PageLoader } from '../../components/ui/PageLoader'
import type { PaginatedResponse, Product } from '../../types'
import styles from './ProductsPage.module.css'

// DataGrid's Row type requires a string index signature, which our domain
// types intentionally don't declare. The intersection is structurally true
// (unknown-typed access to any extra key is harmless) — TS just can't see it
// without help, so this cast is a known/documented exception, not a lie.
type ProductRow = Product & Record<string, unknown>

const columns: ColumnDef<ProductRow>[] = [
  { field: 'name', header: 'Name', type: 'string' },
  {
    field: 'price',
    header: 'Price',
    type: 'number',
    align: 'right',
    renderCell: (value) => `€${(value as number).toFixed(2)}`,
  },
  {
    field: 'is_active',
    header: 'Active',
    align: 'center',
    renderCell: (value) => (
      value
        ? <Eye size={14} strokeWidth={1.5} className={styles.iconOn} aria-label="Active" />
        : <EyeOff size={14} strokeWidth={1.5} className={styles.iconOff} aria-label="Inactive" />
    ),
  },
  {
    field: 'is_featured',
    header: 'Featured',
    align: 'center',
    renderCell: (value) => (
      value
        ? <Star size={14} strokeWidth={1.5} className={styles.iconOn} fill="currentColor" aria-label="Featured" />
        : <Star size={14} strokeWidth={1.5} className={styles.iconOff} aria-label="Not featured" />
    ),
  },
]

export function ProductsPage() {
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const { toast } = useToast()
  const navigate = useNavigate()

  function load(p: number) {
    setLoading(true)
    setError(null)
    getAdminProducts({ page: p, page_size: 20 })
      .then(setData)
      .catch(() => setError('Failed to load products. Please try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  async function handleDelete(product: Product) {
    try {
      await deleteProduct(product.id)
      toast({ title: 'Product deleted.', variant: 'success' })
      setData((prev) => prev ? { ...prev, items: prev.items.filter((p) => p.id !== product.id), total: prev.total - 1 } : prev)
    } catch {
      toast({ title: 'Failed to delete product. Please try again.', variant: 'danger' })
    }
  }

  if (loading) return <PageLoader />
  if (error) return <p role="alert" className={styles.error}>{error}</p>

  const items = data?.items ?? []

  return (
    <Box px={{ base: '4', md: '8' }} py={{ base: '6', md: '12' }}>
      <Box className={styles.header}>
        <h1 className={styles.title}>Products</h1>
      </Box>

      <DataGrid<ProductRow>
        rows={items as ProductRow[]}
        columns={columns}
        options={{
          pagination: false,
          emptyMessage: 'No products found.',
          rowActions: {
            onDelete: (row) => void handleDelete(row),
            extra: [{
              label: 'Edit',
              icon: <Pencil size={14} strokeWidth={1.5} />,
              onClick: (row) => navigate(`/admin/products/${row.id}`),
            }],
          },
          confirmDelete: {
            title: 'Delete Product',
            message: 'Delete this product? This cannot be undone.',
            confirmLabel: 'Delete',
          },
          primaryAction: {
            label: 'Add Product',
            icon: <Plus size={14} strokeWidth={1.5} />,
            onClick: () => navigate('/admin/products/new'),
          },
        }}
      />

      {data && data.total > data.page_size && (
        <Stack direction="row" justify="center" className={styles.pagination}>
          <Pagination
            page={page}
            totalPages={Math.ceil(data.total / data.page_size)}
            onChange={setPage}
          />
        </Stack>
      )}
    </Box>
  )
}
