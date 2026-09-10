import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminEnquiries, updateEnquiryStatus } from '../../api/enquiries'
import { ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink } from 'lucide-react'
import { DataGrid, Select, Textarea, Pagination, Box, Stack, Modal } from '@shehandon/vcs-ui'
import type { ColumnDef } from '@shehandon/vcs-ui'
import { PageLoader } from '../../components/ui/PageLoader'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import type { Enquiry, EnquiryStatus, PaginatedResponse } from '../../types'
import styles from './EnquiriesPage.module.css'

type OrderBy = 'created_at' | 'name' | 'status' | 'email'
type OrderDir = 'asc' | 'desc'

// DataGrid rows must satisfy its Row type (a string-keyed record); Enquiry does.
type EnquiryRow = Enquiry & Record<string, unknown>

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: 'New',
  read: 'Read',
  accepted: 'Accepted',
  rejected: 'Rejected',
}

// Shorten a product name to at most two words; a third word collapses to its
// first letter + "…" (e.g. "Neon Bomber Jacket Deluxe" -> "Neon Bomber J…").
function shortenName(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length <= 2) return words.join(' ')
  return `${words[0]} ${words[1]} ${words[2].charAt(0)}…`
}

// Clean, unambiguous date: "2026-07-06" (local calendar day).
function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function SortHeader({ label, col, orderBy, orderDir, onSort }: {
  label: string; col: OrderBy; orderBy: OrderBy; orderDir: OrderDir; onSort: (col: OrderBy) => void
}) {
  const Icon = col !== orderBy ? ChevronsUpDown : orderDir === 'asc' ? ChevronUp : ChevronDown
  return (
    <button type="button" className={styles.sortBtn} onClick={() => onSort(col)}>
      {label} <Icon size={12} strokeWidth={1.5} className={col === orderBy ? styles.sortIconActive : styles.sortIcon} />
    </button>
  )
}

export function EnquiriesPage() {
  const [data, setData] = useState<PaginatedResponse<Enquiry> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [orderBy, setOrderBy] = useState<OrderBy>('created_at')
  const [orderDir, setOrderDir] = useState<OrderDir>('desc')

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [search])

  const load = useCallback((p: number, status: string, q: string, ob: OrderBy, od: OrderDir) => {
    setLoading(true)
    setLoadError(null)
    getAdminEnquiries({
      page: p,
      page_size: 20,
      ...(status ? { status } : {}),
      ...(q ? { search: q } : {}),
      order_by: ob,
      order_dir: od,
    })
      .then(setData)
      .catch(() => setLoadError('Failed to load enquiries. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(page, statusFilter, debouncedSearch, orderBy, orderDir)
  }, [page, statusFilter, debouncedSearch, orderBy, orderDir, load])

  function handleSort(col: OrderBy) {
    if (col === orderBy) {
      setOrderDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrderBy(col)
      setOrderDir(col === 'created_at' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  async function handleAction(id: string, status: EnquiryStatus, rejectionReason?: string) {
    setUpdateError(null)
    try {
      const updated = await updateEnquiryStatus(id, status, rejectionReason)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          // The update endpoint doesn't return product fields (they default to
          // null), but the product never changes — preserve them from the
          // existing row so the item doesn't disappear after an action.
          items: prev.items.map((e) =>
            e.id === id
              ? {
                  ...updated,
                  product_name: e.product_name,
                  product_slug: e.product_slug,
                  product_thumbnail_url: e.product_thumbnail_url,
                }
              : e,
          ),
        }
      })
    } catch {
      setUpdateError('Failed to update enquiry. Please try again.')
    }
  }

  // Only take over the whole page on the FIRST load. On refetches (search,
  // filter, sort, paging) keep the controls mounted — otherwise the search
  // input unmounts mid-type and loses focus on every keystroke.
  if (loading && !data) return <PageLoader />
  if (loadError && !data) return <p role="alert" className={styles.error}>{loadError}</p>

  const items = data?.items ?? []
  const rows = items as EnquiryRow[]

  const columns: ColumnDef<EnquiryRow>[] = [
    {
      field: 'created_at',
      width: 128,
      renderHeader: () => <SortHeader label="Date" col="created_at" orderBy={orderBy} orderDir={orderDir} onSort={handleSort} />,
      renderCell: (value) => (
        <div className={styles.cell}>
          <span className={styles.date}>{formatDate(value as string)}</span>
        </div>
      ),
    },
    {
      field: 'name',
      minWidth: 190,
      renderHeader: () => <SortHeader label="Customer" col="name" orderBy={orderBy} orderDir={orderDir} onSort={handleSort} />,
      renderCell: (_value, row) => (
        <div className={`${styles.cell} ${styles.customerCell}`}>
          <span className={styles.name}>{row.name}</span>
          <a href={`mailto:${row.email}`} className={styles.email}>{row.email}</a>
          {row.phone && <span className={styles.phone}>{row.phone}</span>}
        </div>
      ),
    },
    {
      field: 'productDetails',
      header: 'Item',
      minWidth: 300,
      renderCell: (_value, row) => <ProductDetails enq={row} />,
    },
    {
      field: 'message',
      header: 'Message',
      minWidth: 260,
      renderCell: (value) => (
        <div className={styles.cell}>
          {value ? <span className={styles.message}>{value as string}</span> : <span className={styles.empty}>—</span>}
        </div>
      ),
    },
    {
      field: 'status',
      width: 148,
      renderHeader: () => <SortHeader label="Status" col="status" orderBy={orderBy} orderDir={orderDir} onSort={handleSort} />,
      renderCell: (value, row) => (
        <div className={`${styles.cell} ${styles.statusCell}`}>
          <span className={`${styles.statusBadge} ${styles[`status_${value as EnquiryStatus}`]}`}>
            {STATUS_LABEL[value as EnquiryStatus]}
          </span>
          {row.status === 'rejected' && row.rejection_reason && (
            <p className={styles.rejectionReason}>{row.rejection_reason}</p>
          )}
        </div>
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      width: 216,
      renderCell: (_value, row) => (
        <div className={`${styles.cell} ${styles.actionsCell}`}>
          <EnquiryActions enq={row} onAction={handleAction} />
        </div>
      ),
    },
  ]

  return (
    <Box px={{ base: '4', md: '8' }} py={{ base: '6', md: '12' }}>
      <h1 className={styles.title}>Enquiries</h1>

      {loadError && <p role="alert" className={styles.error}>{loadError}</p>}
      {updateError && <p role="alert" className={styles.error}>{updateError}</p>}

      <Stack direction={{ base: 'column', sm: 'row' }} align={{ base: 'stretch', sm: 'end' }} gap="3" className={styles.controls}>
        <Input
          type="search"
          label="Search"
          aria-label="Search enquiries"
          placeholder="Search name, email, phone, message…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(v) => { setPage(1); setStatusFilter(v as string) }}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'new', label: 'New' },
            { value: 'read', label: 'Read' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
      </Stack>

      {data && (
        <p className={styles.resultCount}>
          {data.total} {data.total === 1 ? 'enquiry' : 'enquiries'}
          {(statusFilter || debouncedSearch) && ' match your filters'}
        </p>
      )}

      {/* The DataGrid renders its own top bar with a client-side search box +
          column menu. On a server-paginated table that search only filters the
          loaded page, duplicating the (server-side) Search above — so we hide
          it and drive all search/filter from our own controls. The
          [class*="topBar"] selector survives vcs-ui hash changes. */}
      <div className={styles.gridWrap}>
        <DataGrid<EnquiryRow>
          rows={rows}
          columns={columns}
          options={{
            pagination: false,
            emptyMessage: 'No enquiries found.',
            // vcs-ui DataGrid uses ONE fixed height for every row — including
            // group-header rows — so this also sets how thick grouped headers
            // are. Sized to fit the tallest inline cell (the 3-line customer
            // block / product details); the reject form lives in a modal now,
            // so it no longer forces the height up.
            rowHeight: 88,
          }}
        />
      </div>

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

function EnquiryActions({
  enq,
  onAction,
}: {
  enq: Enquiry
  onAction: (id: string, status: EnquiryStatus, rejectionReason?: string) => Promise<void>
}) {
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const isTerminal = enq.status === 'accepted' || enq.status === 'rejected'

  async function act(status: EnquiryStatus, rejectionReason?: string) {
    setBusy(true)
    await onAction(enq.id, status, rejectionReason)
    setBusy(false)
    setRejectOpen(false)
    setReason('')
  }

  function closeReject() {
    setRejectOpen(false)
    setReason('')
  }

  if (isTerminal) return null

  return (
    <>
      <Stack direction="row" wrap gap="2" className={styles.actions}>
        {enq.status === 'new' && (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void act('read')}>
            Mark read
          </Button>
        )}
        <Button variant="primary" size="sm" disabled={busy} onClick={() => void act('accepted')}>
          Accept
        </Button>
        <Button variant="danger" size="sm" disabled={busy} onClick={() => setRejectOpen(true)}>
          Reject
        </Button>
      </Stack>

      <Modal
        open={rejectOpen}
        onClose={closeReject}
        title="Reject enquiry"
        description="Add a reason — it will be shown against the enquiry."
        size="sm"
        footer={
          <Stack direction="row" gap="2" justify="end">
            <Button variant="secondary" size="sm" disabled={busy} onClick={closeReject}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              disabled={reason.trim() === ''}
              onClick={() => void act('rejected', reason.trim())}
            >
              Reject
            </Button>
          </Stack>
        }
      >
        <Textarea
          aria-label="Reason for rejection"
          placeholder="Reason for rejection…"
          value={reason}
          rows={3}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy}
        />
      </Modal>
    </>
  )
}

function ProductDetails({ enq }: { enq: Enquiry }) {
  const hasSize = Boolean(enq.size)
  const hasColor = Boolean(enq.color)
  const hasProduct = Boolean(enq.product_name)

  if (!enq.product_id && !hasSize && !hasColor) {
    return (
      <div className={styles.cell}>
        <span className={styles.empty}>—</span>
      </div>
    )
  }

  const meta = [
    `Qty ${enq.quantity}`,
    hasSize ? `Size ${enq.size}` : null,
    hasColor ? enq.color : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const shortName = enq.product_name ? shortenName(enq.product_name) : ''
  const name = hasProduct
    ? enq.product_slug
      ? (
        <a
          href={`/shop/${enq.product_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.productLink}
          title={enq.product_name ?? undefined}
        >
          <span className={styles.productName}>{shortName}</span>
          <ExternalLink size={12} strokeWidth={1.5} className={styles.productLinkIcon} />
        </a>
      )
      : <span className={styles.productName} title={enq.product_name ?? undefined}>{shortName}</span>
    : null

  return (
    <div className={styles.itemCell}>
      {enq.product_thumbnail_url && (
        <img src={enq.product_thumbnail_url} alt="" className={styles.itemThumb} />
      )}
      <div className={styles.itemInfo}>
        {name}
        <span className={styles.productMeta}>{meta}</span>
      </div>
    </div>
  )
}
