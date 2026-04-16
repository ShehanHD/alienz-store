import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { getAdminEnquiries, updateEnquiryStatus } from '../../api/enquiries'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { PageLoader } from '../../components/ui/PageLoader'
import type { Enquiry, EnquiryStatus, PaginatedResponse } from '../../types'
import styles from './EnquiriesPage.module.css'

type OrderBy = 'created_at' | 'name' | 'status' | 'email'
type OrderDir = 'asc' | 'desc'
type GroupBy = '' | 'status' | 'date'

const STATUS_ORDER: Record<EnquiryStatus, number> = { new: 0, read: 1, accepted: 2, rejected: 3 }

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: 'New',
  read: 'Read',
  accepted: 'Accepted',
  rejected: 'Rejected',
}

interface Group {
  key: string
  label: string
  items: Enquiry[]
}

function groupByStatus(items: Enquiry[]): Group[] {
  const map = new Map<string, Enquiry[]>()
  for (const item of items) {
    const key = item.status
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()]
    .sort(([a], [b]) => (STATUS_ORDER[a as EnquiryStatus] ?? 99) - (STATUS_ORDER[b as EnquiryStatus] ?? 99))
    .map(([key, items]) => ({ key, label: STATUS_LABEL[key as EnquiryStatus] ?? key, items }))
}

function groupByDate(items: Enquiry[]): Group[] {
  const map = new Map<string, Enquiry[]>()
  for (const item of items) {
    const key = new Date(item.created_at).toLocaleDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()].map(([key, items]) => ({ key, label: key, items }))
}

function SortIcon({ col, orderBy, orderDir }: { col: OrderBy; orderBy: OrderBy; orderDir: OrderDir }) {
  if (col !== orderBy) return <ChevronsUpDown size={12} strokeWidth={1.5} className={styles.sortIcon} />
  return orderDir === 'asc'
    ? <ChevronUp size={12} strokeWidth={1.5} className={styles.sortIconActive} />
    : <ChevronDown size={12} strokeWidth={1.5} className={styles.sortIconActive} />
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
  const [groupBy, setGroupBy] = useState<GroupBy>('')

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

  const load = useCallback((p: number, status: string, q: string, ob: OrderBy, od: OrderDir, gb: GroupBy) => {
    setLoading(true)
    setLoadError(null)
    getAdminEnquiries({
      page: p,
      page_size: gb !== '' ? 500 : 20,
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
    load(page, statusFilter, debouncedSearch, orderBy, orderDir, groupBy)
  }, [page, statusFilter, debouncedSearch, orderBy, orderDir, groupBy, load])

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
        return { ...prev, items: prev.items.map((e) => (e.id === id ? updated : e)) }
      })
    } catch {
      setUpdateError('Failed to update enquiry. Please try again.')
    }
  }

  if (loading) return <PageLoader />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  const items = data?.items ?? []

  const groups: Group[] | null =
    groupBy === 'status' ? groupByStatus(items)
    : groupBy === 'date' ? groupByDate(items)
    : null

  const colCount = 6

  return (
    <div className={styles.page}>
      <h1>Enquiries</h1>

      {updateError && <p role="alert" className={styles.error}>{updateError}</p>}

      <div className={styles.controls}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search name, email, phone, message…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search enquiries"
        />
        <div className={styles.selects}>
          <label htmlFor="status-filter" className={styles.srOnly}>Filter by status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value) }}
          >
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <label htmlFor="group-by" className={styles.srOnly}>Group by</label>
          <select
            id="group-by"
            value={groupBy}
            onChange={(e) => { setGroupBy(e.target.value as GroupBy); setPage(1) }}
          >
            <option value="">No grouping</option>
            <option value="status">Group by status</option>
            <option value="date">Group by date</option>
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <p>No enquiries found.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort('created_at')}>
                    Date <SortIcon col="created_at" orderBy={orderBy} orderDir={orderDir} />
                  </button>
                </th>
                <th>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort('name')}>
                    Customer <SortIcon col="name" orderBy={orderBy} orderDir={orderDir} />
                  </button>
                </th>
                <th>Product details</th>
                <th>Message</th>
                <th>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort('status')}>
                    Status <SortIcon col="status" orderBy={orderBy} orderDir={orderDir} />
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups
                ? groups.map((group) => (
                    <Fragment key={group.key}>
                      <tr className={styles.groupRow}>
                        <td colSpan={colCount}>
                          <span className={styles.groupLabel}>{group.label}</span>
                          <span className={styles.groupCount}>{group.items.length}</span>
                        </td>
                      </tr>
                      {group.items.map((enq) => (
                        <EnquiryRow key={enq.id} enq={enq} onAction={handleAction} />
                      ))}
                    </Fragment>
                  ))
                : items.map((enq) => (
                    <EnquiryRow key={enq.id} enq={enq} onAction={handleAction} />
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {!groups && data && data.total > data.page_size && (
        <div className={styles.pagination}>
          {page > 1 && (
            <button type="button" className={styles.pageBtn} onClick={() => setPage((p) => p - 1)} aria-label="Previous">
              <ChevronLeft size={14} strokeWidth={1.5} />
            </button>
          )}
          <span>Page {page}</span>
          {data.total > page * data.page_size && (
            <button type="button" className={styles.pageBtn} onClick={() => setPage((p) => p + 1)} aria-label="Next">
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function EnquiryRow({
  enq,
  onAction,
}: {
  enq: Enquiry
  onAction: (id: string, status: EnquiryStatus, rejectionReason?: string) => Promise<void>
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isTerminal = enq.status === 'accepted' || enq.status === 'rejected'

  async function act(status: EnquiryStatus, rejectionReason?: string) {
    setBusy(true)
    await onAction(enq.id, status, rejectionReason)
    setBusy(false)
    setRejecting(false)
    setReason('')
  }

  function openReject() {
    setRejecting(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function cancelReject() {
    setRejecting(false)
    setReason('')
  }

  return (
    <tr className={rejecting ? styles.rowRejecting : undefined}>
      <td className={styles.date}>{new Date(enq.created_at).toLocaleDateString()}</td>
      <td>
        <span className={styles.name}>{enq.name}</span>
        <a href={`mailto:${enq.email}`} className={styles.email}>{enq.email}</a>
        {enq.phone && <span className={styles.phone}>{enq.phone}</span>}
      </td>
      <td>
        <ProductDetails enq={enq} />
      </td>
      <td className={styles.message}>{enq.message || <span className={styles.empty}>—</span>}</td>
      <td>
        <span className={`${styles.statusBadge} ${styles[`status_${enq.status}`]}`}>
          {STATUS_LABEL[enq.status]}
        </span>
        {enq.status === 'rejected' && enq.rejection_reason && (
          <p className={styles.rejectionReason}>{enq.rejection_reason}</p>
        )}
      </td>
      <td className={styles.actionCell}>
        {!isTerminal && !rejecting && (
          <div className={styles.actions}>
            {enq.status === 'new' && (
              <button
                type="button"
                className={styles.actionBtn}
                disabled={busy}
                onClick={() => void act('read')}
              >
                Mark read
              </button>
            )}
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionAccept}`}
              disabled={busy}
              onClick={() => void act('accepted')}
            >
              Accept
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionReject}`}
              disabled={busy}
              onClick={openReject}
            >
              Reject
            </button>
          </div>
        )}

        {rejecting && (
          <div className={styles.rejectForm}>
            <textarea
              ref={textareaRef}
              className={styles.rejectTextarea}
              placeholder="Reason for rejection…"
              value={reason}
              rows={2}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            />
            <div className={styles.rejectFormActions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionReject}`}
                disabled={busy || reason.trim() === ''}
                onClick={() => void act('rejected', reason.trim())}
              >
                Confirm reject
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                disabled={busy}
                onClick={cancelReject}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}

function ProductDetails({ enq }: { enq: Enquiry }) {
  const hasSize = Boolean(enq.size)
  const hasColor = Boolean(enq.color)

  if (!enq.product_id && !hasSize && !hasColor) {
    return <span className={styles.empty}>—</span>
  }

  return (
    <dl className={styles.productDetails}>
      {hasSize && (
        <>
          <dt>Size</dt>
          <dd>{enq.size}</dd>
        </>
      )}
      {hasColor && (
        <>
          <dt>Color</dt>
          <dd>{enq.color}</dd>
        </>
      )}
      <dt>Qty</dt>
      <dd>{enq.quantity}</dd>
    </dl>
  )
}
