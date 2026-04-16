import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createProduct, updateProduct, getImageConfig, uploadProductImage } from '../../api/admin'
import { compressImage } from '../../utils/compressImage'
import type { ProductPayload } from '../../api/admin'
import { getApiClient } from '../../api/client'
import { ProductSchema } from '../../api/schemas/products'
import { getCategories } from '../../api/categories'
import { getRefColors, getRefSizes, getRefAttributes, ATTRIBUTE_LABELS } from '../../api/refData'
import type { RefItem, AttributeType } from '../../api/refData'
import { Button } from '../../components/ui/Button'
import { ImageUploader } from '../../components/ui/ImageUploader'
import { Input } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/PageLoader'
import { useToast } from '../../contexts/ToastContext'
import type { Category, Product, ProductImage } from '../../types'
import styles from './ProductFormPage.module.css'

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

export function ProductFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  // Reference data
  const [categories, setCategories] = useState<Category[]>([])
  const [refColors, setRefColors] = useState<RefItem[]>([])
  const [refSizes, setRefSizes] = useState<RefItem[]>([])
  const [refAttributes, setRefAttributes] = useState<Record<AttributeType, RefItem[]>>({
    model: [], fit: [], material: [], accessory_style: [],
  })
  const [maxImages, setMaxImages] = useState(6)
  const [maxUploadMb, setMaxUploadMb] = useState(10)

  // Product fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [selectedFits, setSelectedFits] = useState<string[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [selectedAccessoryStyles, setSelectedAccessoryStyles] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  const [images, setImages] = useState<ProductImage[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [savedProductId, setSavedProductId] = useState<string | null>(id ?? null)

  // UI state
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Load reference data + image limits — each independently so one failure
  // doesn't block the others (e.g. missing migration)
  useEffect(() => {
    void getCategories().then(setCategories).catch(() => {})
    void getRefColors().then(setRefColors).catch(() => {})
    void getRefSizes().then(setRefSizes).catch(() => {})
    const attrTypes: AttributeType[] = ['model', 'fit', 'material', 'accessory_style']
    attrTypes.forEach((t) => {
      void getRefAttributes(t).then((items) => setRefAttributes((prev) => ({ ...prev, [t]: items }))).catch(() => {})
    })
    void getImageConfig()
      .then((cfg) => { setMaxImages(cfg.max_images_per_product); setMaxUploadMb(cfg.max_upload_size_mb) })
      .catch(() => {})
  }, [])

  // Load existing product for edit
  useEffect(() => {
    if (!isEdit || !id) return
    setLoading(true)
    getApiClient().get(`/admin/products/${id}`)
      .then((res) => {
        const p: Product = ProductSchema.parse(res.data)
        setName(p.name)
        setDescription(p.description)
        setPrice(String(p.price))
        setCategoryIds(p.category_ids ?? (p.category_id ? [p.category_id] : []))
        setSelectedSizes(p.sizes)
        setSelectedColors(p.colors)
        setSelectedModels(p.models ?? [])
        setSelectedFits(p.fits ?? [])
        setSelectedMaterials(p.materials ?? [])
        setSelectedAccessoryStyles(p.accessory_styles ?? [])
        setIsActive(p.is_active)
        setIsFeatured(p.is_featured)
        setImages(p.images)
        setSavedProductId(p.id)
      })
      .catch(() => setLoadError('Failed to load product. Please try again.'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const payload: ProductPayload = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category_ids: categoryIds,
      sizes: selectedSizes,
      colors: selectedColors,
      models: selectedModels,
      fits: selectedFits,
      materials: selectedMaterials,
      accessory_styles: selectedAccessoryStyles,
      is_active: isActive,
      is_featured: isFeatured,
    }

    let productId = savedProductId
    try {
      if (isEdit && id) {
        await updateProduct(id, payload)
        productId = id
      } else {
        const created = await createProduct(payload)
        productId = created.id
        setSavedProductId(created.id)
      }
    } catch {
      toast('Failed to save product. Please try again.', 'error')
      setSubmitting(false)
      return
    }

    // Upload queued images (both new and edit)
    if (productId && pendingFiles.length > 0) {
      const toUpload = pendingFiles.slice(0, maxImages - images.length)
      try {
        for (const file of toUpload) {
          const compressed = await compressImage(file)
          await uploadProductImage(productId, compressed)
        }
        setPendingFiles([])
      } catch {
        setPendingFiles([])
        toast('Product saved but some images failed to upload.', 'error')
        setSubmitting(false)
        return
      }
    }

    toast(isEdit ? 'Product updated.' : 'Product created.', 'success')
    setSubmitting(false)
    navigate('/admin/products')
  }

  if (loading) return <PageLoader />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  return (
    <div className={styles.page}>
      <h1>{isEdit ? 'Edit Product' : 'New Product'}</h1>

      <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>

        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Description</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <Input
          label="Price €"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        {/* Category — multi-select */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Categories</label>
          <div className={styles.chips}>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`${styles.chip} ${categoryIds.includes(c.id) ? styles.chipActive : ''}`}
                onClick={() => setCategoryIds(toggle(categoryIds, c.id))}
                aria-pressed={categoryIds.includes(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        {refColors.length > 0 && (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Colors</label>
            <div className={styles.colorChips}>
              {refColors.map((c) => {
                const active = selectedColors.includes(c.name)
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`${styles.colorChip} ${active ? styles.colorChipActive : ''}`}
                    onClick={() => setSelectedColors(toggle(selectedColors, c.name))}
                    aria-pressed={active}
                    title={c.name}
                  >
                    <span
                      className={styles.colorSwatch}
                      style={{
                        background: c.hex ?? '#ccc',
                        border: c.hex === '#ffffff' ? '1px solid #e8e8e8' : 'none',
                      }}
                    />
                    <span>{c.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Sizes */}
        {refSizes.length > 0 && (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Sizes</label>
            <div className={styles.chips}>
              {refSizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.chip} ${selectedSizes.includes(s.name) ? styles.chipActive : ''}`}
                  onClick={() => setSelectedSizes(toggle(selectedSizes, s.name))}
                  aria-pressed={selectedSizes.includes(s.name)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attributes: Model, Fit, Material, Accessory Style */}
        {(
          [
            ['model', selectedModels, setSelectedModels],
            ['fit', selectedFits, setSelectedFits],
            ['material', selectedMaterials, setSelectedMaterials],
            ['accessory_style', selectedAccessoryStyles, setSelectedAccessoryStyles],
          ] as const
        ).map(([type, selected, setSelected]) =>
          refAttributes[type].length > 0 ? (
            <div key={type} className={styles.field}>
              <label className={styles.fieldLabel}>{ATTRIBUTE_LABELS[type]}</label>
              <div className={styles.chips}>
                {refAttributes[type].map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`${styles.chip} ${selected.includes(a.name) ? styles.chipActive : ''}`}
                    onClick={() => setSelected(toggle(selected, a.name))}
                    aria-pressed={selected.includes(a.name)}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null
        )}

        {/* Images */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            Images
            <span className={styles.fieldNote}> — max {maxImages}, up to {maxUploadMb}MB each</span>
          </label>
          <ImageUploader
            productId={savedProductId ?? undefined}
            images={images}
            pendingFiles={pendingFiles}
            maxImages={maxImages}
            maxUploadMb={maxUploadMb}
            onImagesChange={setImages}
            onPendingChange={setPendingFiles}
          />
        </div>

        {/* Toggles */}
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={`${styles.toggle} ${isActive ? styles.toggleOn : ''}`}
            onClick={() => setIsActive((v) => !v)}
            aria-pressed={isActive}
          >
            <span className={styles.toggleThumb} />
          </button>
          <span className={styles.toggleLabel}>Active</span>

          <button
            type="button"
            className={`${styles.toggle} ${isFeatured ? styles.toggleOn : ''}`}
            onClick={() => setIsFeatured((v) => !v)}
            aria-pressed={isFeatured}
            style={{ marginLeft: 'var(--space-6)' }}
          >
            <span className={styles.toggleThumb} />
          </button>
          <span className={styles.toggleLabel}>Featured</span>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/products')}>Cancel</Button>
          <Button type="submit" loading={submitting}>Save</Button>
        </div>
      </form>
    </div>
  )
}

