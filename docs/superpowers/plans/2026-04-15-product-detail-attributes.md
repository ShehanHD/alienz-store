# Product Detail Attributes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display all product attribute fields (category, materials, fits, models, accessory_styles) on the public ProductDetailPage as read-only chip groups.

**Architecture:** Add a static chip display block between the product description and the enquiry form. Reuse existing `.selectorField` / `.selectorLabel` CSS classes; add a new `.chipStatic` class for non-interactive chips rendered as `<span>`.

**Tech Stack:** React, TypeScript, CSS Modules, Vitest + Testing Library

---

### Task 1: Add `.chipStatic` CSS class

**Files:**
- Modify: `frontend/src/pages/public/ProductDetailPage.module.css`

- [ ] **Step 1: Add the static chip class**

Open `frontend/src/pages/public/ProductDetailPage.module.css` and append at the end:

```css
.chipStatic {
  display: inline-block;
  border: 1px solid var(--border-dark);
  padding: 0.35rem 0.875rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/public/ProductDetailPage.module.css
git commit -m "feat: add chipStatic css class for read-only attribute chips"
```

---

### Task 2: Write failing tests for the attributes block

**Files:**
- Modify: `frontend/src/pages/public/ProductDetailPage.test.tsx`

- [ ] **Step 1: Extend the mock product with attribute data**

Replace the `mockProduct` at the top of `frontend/src/pages/public/ProductDetailPage.test.tsx` with:

```ts
const mockProduct = {
  id: '1', name: 'Blue Dress', slug: 'blue-dress', description: 'Nice',
  price: 49.99, category_id: 'c1', category_ids: ['c1'],
  category: { id: 'c1', name: 'Dresses', slug: 'dresses', sort_order: 1, show_in_navbar: true },
  sizes: ['S', 'M'], colors: ['Blue'],
  is_active: true, is_featured: false,
  models: ['Regular'], fits: ['Slim'], materials: ['Cotton', 'Linen'],
  accessory_styles: ['Casual'],
  images: [], created_at: '', updated_at: '',
}
```

- [ ] **Step 2: Add attribute rendering tests**

Append these tests to `frontend/src/pages/public/ProductDetailPage.test.tsx`:

```ts
it('shows category chip', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByText('Dresses')).toBeInTheDocument())
})

it('shows materials chips', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByText('Cotton')).toBeInTheDocument())
  expect(screen.getByText('Linen')).toBeInTheDocument()
})

it('shows fits chips', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByText('Slim')).toBeInTheDocument())
})

it('shows models chips', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByText('Regular')).toBeInTheDocument())
})

it('shows accessory_styles chips', async () => {
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByText('Casual')).toBeInTheDocument())
})

it('does not render empty attribute groups', async () => {
  const { getProduct } = await import('../../api/products')
  vi.mocked(getProduct).mockResolvedValueOnce({
    ...mockProduct,
    category: undefined,
    materials: [],
    fits: [],
    models: [],
    accessory_styles: [],
  })
  render(
    <MemoryRouter initialEntries={['/shop/blue-dress']}>
      <Routes><Route path="/shop/:slug" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByText('Blue Dress')).toBeInTheDocument())
  expect(screen.queryByText('Category')).not.toBeInTheDocument()
  expect(screen.queryByText('Materials')).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd frontend && npm run test:run -- ProductDetailPage
```

Expected: new tests FAIL with "Unable to find an element with the text: Dresses" etc.

- [ ] **Step 4: Commit failing tests**

```bash
git add frontend/src/pages/public/ProductDetailPage.test.tsx
git commit -m "test: add failing tests for product attribute chips"
```

---

### Task 3: Implement the attributes block

**Files:**
- Modify: `frontend/src/pages/public/ProductDetailPage.tsx`

- [ ] **Step 1: Add the attributes block to the JSX**

In `frontend/src/pages/public/ProductDetailPage.tsx`, locate the `<div className={styles.info}>` block. After the `{product.description && ...}` paragraph and before the `{!sent && <form ...>}` block, insert:

```tsx
{/* Product attributes */}
{(product.category || product.materials.length > 0 || product.fits.length > 0 || product.models.length > 0 || product.accessory_styles.length > 0) && (
  <div className={styles.attributes}>
    {product.category && (
      <div className={styles.selectorField}>
        <span className={styles.selectorLabel}>Category</span>
        <div className={styles.chips}>
          <span className={styles.chipStatic}>{product.category.name}</span>
        </div>
      </div>
    )}
    {product.materials.length > 0 && (
      <div className={styles.selectorField}>
        <span className={styles.selectorLabel}>Materials</span>
        <div className={styles.chips}>
          {product.materials.map((m) => (
            <span key={m} className={styles.chipStatic}>{m}</span>
          ))}
        </div>
      </div>
    )}
    {product.fits.length > 0 && (
      <div className={styles.selectorField}>
        <span className={styles.selectorLabel}>Fits</span>
        <div className={styles.chips}>
          {product.fits.map((f) => (
            <span key={f} className={styles.chipStatic}>{f}</span>
          ))}
        </div>
      </div>
    )}
    {product.models.length > 0 && (
      <div className={styles.selectorField}>
        <span className={styles.selectorLabel}>Models</span>
        <div className={styles.chips}>
          {product.models.map((m) => (
            <span key={m} className={styles.chipStatic}>{m}</span>
          ))}
        </div>
      </div>
    )}
    {product.accessory_styles.length > 0 && (
      <div className={styles.selectorField}>
        <span className={styles.selectorLabel}>Style</span>
        <div className={styles.chips}>
          {product.accessory_styles.map((s) => (
            <span key={s} className={styles.chipStatic}>{s}</span>
          ))}
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 2: Add `.attributes` CSS class**

Append to `frontend/src/pages/public/ProductDetailPage.module.css`:

```css
.attributes {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
```

- [ ] **Step 3: Run tests to confirm they pass**

```bash
cd frontend && npm run test:run -- ProductDetailPage
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/public/ProductDetailPage.tsx frontend/src/pages/public/ProductDetailPage.module.css
git commit -m "feat: show product attribute chips on product detail page"
```
