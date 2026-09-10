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
import { Chip } from '../../components/ui/Chip'
import { PageLoader } from '../../components/ui/PageLoader'
import { Textarea, Switch, useToast, Container, Stack, Chips } from '@shehandon/vcs-ui'
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
      toast({ title: 'Failed to save product. Please try again.', variant: 'danger' })
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
        toast({ title: 'Product saved but some images failed to upload.', variant: 'danger' })
        setSubmitting(false)
        return
      }
    }

    toast({ title: isEdit ? 'Product updated.' : 'Product created.', variant: 'success' })
    setSubmitting(false)
    navigate('/admin/products')
  }

  if (loading) return <PageLoader />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  return (
    <Container size="md" padding="6">
      <h1 className={styles.title}>{isEdit ? 'Edit Product' : 'New Product'}</h1>

      <Stack as="form" direction="column" gap="6" onSubmit={(e) => void handleSubmit(e)}>

        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />

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
        <Stack direction="column" gap="2">
          <label className={styles.fieldLabel}>Categories</label>
          <Chips
            mode="multiple"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={categoryIds}
            onChange={setCategoryIds}
          />
        </Stack>

        {/* Colors */}
        {refColors.length > 0 && (
          <Stack direction="column" gap="2">
            <label className={styles.fieldLabel}>Colors</label>
            <Stack direction="row" wrap gap="2">
              {refColors.map((c) => (
                <Chip
                  key={c.id}
                  selected={selectedColors.includes(c.name)}
                  onClick={() => setSelectedColors(toggle(selectedColors, c.name))}
                  title={c.name}
                  icon={
                    <span
                      className={styles.colorSwatch}
                      style={{
                        background: c.hex ?? 'var(--border-strong)',
                        border: c.hex === '#ffffff' ? '1px solid var(--border)' : 'none',
                      }}
                    />
                  }
                >
                  {c.name}
                </Chip>
              ))}
            </Stack>
          </Stack>
        )}

        {/* Sizes */}
        {refSizes.length > 0 && (
          <Stack direction="column" gap="2">
            <label className={styles.fieldLabel}>Sizes</label>
            <Chips
              mode="multiple"
              options={refSizes.map((s) => s.name)}
              value={selectedSizes}
              onChange={setSelectedSizes}
            />
          </Stack>
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
            <Stack key={type} direction="column" gap="2">
              <label className={styles.fieldLabel}>{ATTRIBUTE_LABELS[type]}</label>
              <Chips
                mode="multiple"
                options={refAttributes[type].map((a) => a.name)}
                value={selected}
                onChange={setSelected}
              />
            </Stack>
          ) : null
        )}

        {/* Images */}
        <Stack direction="column" gap="2">
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
        </Stack>

        {/* Toggles */}
        <Stack direction="row" align="center" gap="6">
          <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} label="Active" />
          <Switch checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} label="Featured" />
        </Stack>

        <Stack direction="row" gap="3">
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/products')}>Cancel</Button>
          <Button type="submit" loading={submitting}>Save</Button>
        </Stack>
      </Stack>
    </Container>
  )
}

