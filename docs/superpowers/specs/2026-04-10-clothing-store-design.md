# Clothing Store Web App — Design Spec
**Date:** 2026-04-10

---

## 1. Overview

An online clothing store where visitors can browse products and submit orders or enquiries via email. No online payments at launch — Stripe integration is planned for a future phase. Clients can register for an account to access a personal area (order history, wishlist, profile). Admins manage the catalog and enquiries. An owner role (the site developer) controls all system limits and configuration.

---

## 2. Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React + Vite + TypeScript | Hostinger (static build) |
| Backend | FastAPI (Python) | Vercel (serverless functions) |
| Database | PostgreSQL | Supabase (new project, free tier) |
| File Storage | Supabase Storage | Same Supabase project |
| Auth | Custom JWT in FastAPI (bcrypt + access/refresh tokens) | — |
| Image processing | Pillow (resize → WebP + thumbnail) | Runs in FastAPI |

**Key decisions:**
- Auth is implemented entirely in FastAPI — no dependency on Supabase Auth. The DB can be swapped later without touching auth logic.
- Vercel is used for FastAPI as Python serverless functions. The 10-second free-tier timeout is acceptable for this workload.
- Supabase is used only for PostgreSQL and Storage (not Auth).

---

## 3. Authentication & Roles

### JWT Strategy
- **Access token** — 15-minute lifetime, sent in `Authorization: Bearer` header
- **Refresh token** — 7-day lifetime, stored in `httpOnly` cookie
- FastAPI issues both on login; refresh endpoint rotates the refresh token

### Roles
| Role | Permissions |
|---|---|
| `client` | Browse shop, wishlist, order history, profile/address |
| `admin` | All client permissions + manage products, categories, enquiries, client accounts |
| `owner` | All admin permissions + change site config/limits |

### Owner bootstrap
The `owner` account is created via a one-time `/setup` endpoint using `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables set in Vercel. The endpoint permanently disables itself after first use. New admins can be promoted by the owner from `/admin/clients` — never elevated to `owner` via the UI.

---

## 4. Image Upload Flow

1. Admin uploads image via `/admin/products/new` or `/admin/products/:id`
2. FastAPI receives the file, validates size against `max_upload_size_mb` config
3. Pillow resizes to max `image_output_max_width` (default 1200px), converts to **WebP**
4. Pillow generates a **300×300 thumbnail** (WebP)
5. Both files uploaded to Supabase Storage
6. URLs saved to `product_images` table
7. FastAPI checks total storage used against `storage_quota_mb` — blocks upload if exceeded

---

## 5. Site Configuration (`site_config` table)

All limits are stored as key/value pairs in the DB and editable only by the `owner` role via `/admin/settings`. FastAPI reads and enforces these server-side on every relevant request.

| Key | Default | Description |
|---|---|---|
| `max_products` | 15 | Max products in catalog |
| `max_images_per_product` | 6 | Images per product across all uploads |
| `storage_quota_mb` | 10240 | Total Supabase Storage cap (MB) |
| `max_upload_size_mb` | 10 | Max file size per upload before optimisation |
| `image_output_max_width` | 1200 | Output width after Pillow resize (px) |
| `enquiry_email` | — | Recipient for all order/enquiry emails |
| `maintenance_mode` | false | Blocks public access (admin/owner still works) |
| `max_wishlist_items` | 50 | Wishlist cap per client |
| `allow_registrations` | true | Toggle new client sign-ups on/off |

---

## 6. Pages & Routes

### Public (no auth)
| Route | Page | Notes |
|---|---|---|
| `/` | Home | Hero, featured products, about snippet |
| `/shop` | Product Listing | Filter by category, grid, pagination |
| `/shop/:slug` | Product Detail | Images, sizes, colours, enquiry button |
| `/contact` | Contact / Enquire | General enquiry form → email |
| `/maintenance` | Maintenance | Shown when `maintenance_mode = true` |

### Auth
| Route | Page |
|---|---|
| `/auth/login` | Login |
| `/auth/register` | Register (gated by `allow_registrations`) |
| `/auth/forgot-password` | Password Reset |

### Client Area (role: client+)
| Route | Page | Notes |
|---|---|---|
| `/account` | Dashboard | Overview, quick links |
| `/account/orders` | Order History | Past enquiries/orders |
| `/account/wishlist` | Wishlist | Saved items, capped by config |
| `/account/profile` | Profile & Address | Name, email, address, change password |

### Admin Area (role: admin+)
| Route | Page | Notes |
|---|---|---|
| `/admin` | Dashboard | Stats: products, enquiries, storage usage |
| `/admin/products` | Products | List, add, edit, delete |
| `/admin/products/new` | Add Product | Form with image upload |
| `/admin/products/:id` | Edit Product | Same form, pre-filled |
| `/admin/categories` | Categories | Add, rename, delete |
| `/admin/enquiries` | Enquiries | View all, update status |
| `/admin/clients` | Client Accounts | View, disable, delete, promote to admin |
| `/admin/settings` | Settings | **Owner only** — all config limits |

---

## 7. Data Model

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | TEXT | Unique |
| hashed_password | TEXT | bcrypt |
| role | ENUM | 'client' \| 'admin' \| 'owner' |
| first_name, last_name | TEXT | |
| is_active | BOOL | Soft disable |
| created_at | TIMESTAMPTZ | |

### `addresses`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | → users |
| street, city, country, postal_code | TEXT | |
| is_default | BOOL | One default per user |

### `categories`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | TEXT | |
| slug | TEXT | Unique, URL-friendly |
| sort_order | INT | Display order |

### `products`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name, slug | TEXT | slug unique |
| description | TEXT | |
| price | NUMERIC(10,2) | |
| category_id | UUID | → categories |
| sizes | TEXT[] | e.g. ['XS','S','M','L','XL'] |
| colors | TEXT[] | e.g. ['Black','White','Red'] |
| is_active | BOOL | Draft/published toggle |
| created_at, updated_at | TIMESTAMPTZ | |

### `product_images`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| product_id | UUID | → products |
| url | TEXT | Supabase Storage URL (WebP) |
| thumbnail_url | TEXT | 300×300 WebP |
| is_primary | BOOL | Main display image |
| sort_order | INT | |

### `wishlist_items`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | → users |
| product_id | UUID | → products |
| created_at | TIMESTAMPTZ | |
| — | — | UNIQUE(user_id, product_id) |

### `enquiries`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | → users (nullable — guests allowed) |
| product_id | UUID | → products (nullable — general enquiries) |
| name, email | TEXT | |
| message | TEXT | |
| status | ENUM | 'new' \| 'read' \| 'replied' |
| created_at | TIMESTAMPTZ | |

### `site_config`
| Column | Type | Notes |
|---|---|---|
| key | TEXT | Primary key |
| value | TEXT | Stored as string, parsed by FastAPI |
| updated_at | TIMESTAMPTZ | |

---

## 8. Future: Online Payments

When ready to add payments:
- Stripe Checkout or Payment Intents integrates directly into FastAPI
- The `enquiries` table evolves into an `orders` table with payment status
- No platform migration required — the stack supports this natively

---

## 9. Placeholder Images

Until real product images are uploaded, use: `https://placehold.co/600x400`
