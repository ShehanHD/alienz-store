# Product Detail Page — Show All Attributes

**Date:** 2026-04-15

## Goal

Display all product attribute data on the public `ProductDetailPage`, so users can see the full product spec before submitting an enquiry.

## Current State

`ProductDetailPage` currently shows: images, name, price, description, and an enquiry form with interactive size/color selectors.

The following `Product` fields are fetched but never rendered:
- `category` (object with `name`)
- `materials` (string[])
- `fits` (string[])
- `models` (string[])
- `accessory_styles` (string[])

`sizes` and `colors` are already rendered interactively inside the enquiry form and will not be duplicated.

## Design

### New "Attributes" Block

Insert a new attributes section in `ProductDetailPage` between the description and the enquiry form.

**Behaviour:**
- Each field only renders if its value is non-empty (array length > 0, or category exists).
- Fields and their labels:
  - `category.name` → **Category**
  - `materials` → **Materials**
  - `fits` → **Fits**
  - `models` → **Models**
  - `accessory_styles` → **Style**

**Visual:**
- Label: reuses existing `.selectorLabel` class (uppercase, small, secondary color).
- Chips: same visual as `.chip` but read-only — rendered as `<span>` not `<button>`, no hover/active/cursor styles.
- Layout: each attribute is a row (label above chips), same `.selectorField` wrapper class already used for size/color.

### CSS Changes

Add a `.chipStatic` class to `ProductDetailPage.module.css` — identical to `.chip` but with `cursor: default` and no hover/active transitions.

### Files Changed

- `frontend/src/pages/public/ProductDetailPage.tsx` — add attributes block
- `frontend/src/pages/public/ProductDetailPage.module.css` — add `.chipStatic`
