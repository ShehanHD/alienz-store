# Collaborators Section & Footer — Design Spec

**Date:** 2026-04-15  
**Status:** Approved

---

## Overview

Add a Collaborators section to the homepage and replace the minimal footer with a full dark footer containing a contact form, navigation links, contact details, and social icons.

---

## 1. Collaborators — Backend

### Database

New migration: `migrations/006_collaborators.sql`

```sql
CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  instagram_url TEXT NOT NULL,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

`is_featured` marks the 2 collaborators shown as large hero cards. All others appear in the auto-scroll strip. There is no enforced limit on featured count but the UI is designed for 2.

### API Router

New file: `api/routers/collaborators.py`  
Registered in `api/index.py`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/collaborators` | Public | Returns all collaborators ordered by `display_order` |
| `POST` | `/collaborators` | Admin | Create a collaborator |
| `PUT` | `/collaborators/{id}` | Admin | Update a collaborator |
| `DELETE` | `/collaborators/{id}` | Admin | Delete a collaborator |
| `PATCH` | `/collaborators/reorder` | Admin | Update display_order for multiple items |

Image upload uses existing `api/storage.py` (Supabase storage).

Response rows must normalise `id` to `str(uuid)` and `created_at` to `.isoformat()` — same pattern as `_normalise_product_row()` in `products.py`.

---

## 2. Collaborators — Homepage Section

### Placement

Rendered in `HomePage.tsx` below the Featured Products section, inside the existing `.page` container.

### Component

**New files:**
- `frontend/src/components/ui/CollaboratorsSection.tsx`
- `frontend/src/components/ui/CollaboratorsSection.module.css`

### Layout

- Section heading: "Collaborators" — same uppercase label style as "Featured" (`font-size: 0.6875rem`, `letter-spacing: 0.18em`, `border-bottom: 1px solid var(--border)`)
- If zero collaborators exist: the entire section (including heading) renders nothing
- **Hero row** (if any featured collaborators exist): 2-column grid of large cards
  - Aspect ratio 16:9
  - Full-bleed image background (`background-image: url(image_url)`, `background-size: cover`)
  - If `image_url` is null: dark grey placeholder background (`#2a2a2a`)
  - Linear gradient overlay (bottom to transparent) for name legibility
  - Collaborator name overlaid at bottom-left in white
  - Whole card is an `<a>` linking to `instagram_url` (target `_blank`, `rel="noopener noreferrer"`)
  - If no featured collaborators: hero row is skipped entirely
- **Auto-scroll strip** (non-featured collaborators, or all if none are featured):
  - Horizontal strip with CSS `@keyframes` marquee — no JS
  - Items: square image (`70px × 70px`) + name below in uppercase label style
  - If `image_url` is null: dark grey placeholder square (`#2a2a2a`)
  - List duplicated in DOM for seamless infinite loop
  - Each item is an `<a>` linking to `instagram_url` (target `_blank`, `rel="noopener noreferrer"`)
  - Strip is `overflow: hidden` with no scrollbar
  - Images uploaded to existing `product-images` Supabase bucket under a `collaborators/` path prefix

### API

**New file:** `frontend/src/api/collaborators.ts`  
Follows existing pattern: Axios via `getApiClient()`, Zod schema validation.

```ts
// Zod schema
CollaboratorSchema = z.object({
  id: z.string(),
  name: z.string(),
  instagram_url: z.string(),
  image_url: z.string().nullable(),
  is_featured: z.boolean(),
  display_order: z.number(),
})
```

Function: `getCollaborators(): Promise<Collaborator[]>`

---

## 3. Footer

### Scope

Replaces the current one-liner `Footer.tsx` and `Footer.module.css` entirely.

### Layout

Full-width dark footer (`background: #111`, `color: #fff`).  
3-column CSS grid: left column (info) + right spanning 2 columns (form).

**Left column — stacked in 3 blocks:**
1. **Navigate** — links: Shop (`/shop`), Contact (`/contact`)
2. **Get in Touch** — phone number + email address (hardcoded constants in the component)
3. **Follow** — Instagram icon button + TikTok icon button (hardcoded URLs, open in new tab)

**Right (2-col span) — Contact form:**
- Fields: Name, Email, Message (textarea)
- Submit button: "Send Message"
- Reuses `submitEnquiry` from `frontend/src/api/enquiries.ts` (same call as `ContactPage.tsx`)
- Inline success message on send; inline error message on failure
- No page navigation on submit

**Bottom bar:**  
`© {year} AlienzStore` — same copyright text as current footer, centred, `border-top: 1px solid #222`.

### Hardcoded constants (top of Footer.tsx)

```ts
const PHONE = '+1 234 567 8900'        // update to real number
const EMAIL = 'hello@alienz.com'       // update to real email
const INSTAGRAM_URL = 'https://instagram.com/alienzstore'
const TIKTOK_URL = 'https://tiktok.com/@alienzstore'
```

### Files modified

- `frontend/src/components/layout/Footer.tsx` — full rewrite
- `frontend/src/components/layout/Footer.module.css` — full rewrite

---

## 4. Admin Panel — Collaborators

### New page

`frontend/src/pages/admin/CollaboratorsAdminPage.tsx`

**Features:**
- List all collaborators: thumbnail, name, Instagram URL, featured badge, drag handle
- **Add / Edit** via inline form (same pattern as existing admin pages):
  - Fields: Name, Instagram URL, Image (via `ImageUploader`), Is Featured toggle
- **Delete** with confirm dialog (uses existing `useConfirm` hook)
- **Drag-to-reorder** (uses existing `useDragSort` hook, calls `PATCH /collaborators/reorder` on drop)
- Image upload via existing `ImageUploader` component → Supabase storage

### Routing & navigation

- `App.tsx`: new route `/admin/collaborators` wrapped in `RequireAdmin`
- Admin navbar: new "Collaborators" link added alongside existing admin nav items
