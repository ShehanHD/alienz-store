# Email Feature — Design Spec
**Date:** 2026-04-16

---

## 1. Overview

Add email sending to the clothing store for three triggers:

1. **Enquiry notification** — admin receives an email when a customer submits an enquiry
2. **Enquiry confirmation** — customer receives a confirmation when their enquiry is submitted
3. **Registration confirmation** — new registrants receive an email with a verification link; accounts are inactive until the link is clicked

---

## 2. Email Infrastructure

### Provider
Hostinger SMTP (uses the domain's existing email hosting).

### Sending strategy
Synchronous — email is sent within the request before the response is returned. This is the safest approach on Vercel serverless (no risk of function termination killing an in-flight background task).

If SMTP fails on an enquiry submission, the failure is **logged server-side but does not return an error to the client** — the enquiry is already saved to the DB and is not lost.

If SMTP fails on registration, the error **is** returned to the client (the user cannot proceed without confirming their email).

### New module
`api/email.py` — owns the SMTP connection and exposes three public functions:

```python
send_enquiry_notification(enquiry: dict, admin_email: str, product_name: str | None) -> None
send_enquiry_confirmation(enquiry: dict, product_name: str | None) -> None
send_email_confirmation(to_email: str, token: str) -> None
```

`product_name` is resolved by the enquiry router with a `SELECT name FROM products WHERE id = %s` after the insert, only when `product_id` is not null. Passed as `None` for general enquiries.

Templates are plain HTML built with f-strings — no templating library dependency.

### New config vars (`api/config.py` + `.env`)

| Var | Example |
|---|---|
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `noreply@yourdomain.com` |
| `SMTP_PASSWORD` | `...` |
| `FROM_EMAIL` | `noreply@yourdomain.com` |

---

## 3. Registration & Email Confirmation

### Flow

1. `POST /auth/register`
   - Creates user with `is_active = FALSE`
   - Inserts a row in `email_confirmations` (token = 32-byte random hex, expires 24h)
   - Sends confirmation email to the registered address
   - Returns `201 {"detail": "Check your email to confirm your account"}`
   - **No access token is issued** — user cannot log in until confirmed

2. `GET /auth/confirm-email?token=xxx`
   - Validates token: exists, not used (`used_at IS NULL`), not expired (`expires_at > now()`)
   - Sets `users.is_active = TRUE`, sets `email_confirmations.used_at = now()`
   - Returns `200 {"detail": "Email confirmed. You can now log in."}`
   - Frontend redirects to `/auth/login`
   - Expired token → `410 Gone`; invalid/used token → `400 Bad Request`

3. `POST /auth/resend-confirmation`
   - Accepts `{"email": "..."}`
   - If account exists and is still inactive: invalidates old tokens, inserts a fresh token, sends a new email
   - Always returns `200 {"detail": "If that account exists and is unconfirmed, a new link has been sent."}` (no email enumeration)

### New DB table: `email_confirmations`

```sql
CREATE TABLE email_confirmations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
    used_at     TIMESTAMPTZ
);
```

### Confirmation email content
- **Subject:** `Confirm your email address`
- **Body:** Greeting, brief explanation, prominent "Confirm Email" button/link pointing to `{FRONTEND_URL}/auth/confirm-email?token={token}`, 24h expiry note

---

## 4. Enquiry Emails

Both emails fire synchronously after `POST /enquiries` saves to the DB.

### Admin notification
- **To:** `enquiry_email` value from `site_config`
- **Subject:** `New enquiry from {name}`
- **Body:** Name, email, phone, message. If product enquiry: product name, selected size, selected color, and a link to `/admin/enquiries`.

### Customer confirmation
- **To:** Email submitted in the enquiry form
- **Subject:** `We received your enquiry`
- **Body:** "Thanks {name}, we've received your enquiry and will be in touch soon." + summary of submitted details (message, and if product enquiry: product name, size, color).

### SMTP failure handling
- Both emails attempted after DB insert
- SMTP errors are caught, logged with `logging.error(...)`, and swallowed — the endpoint returns success regardless
- The enquiry record is always preserved

---

## 5. Frontend Changes

### Registration
- After `POST /auth/register` succeeds, show a "Check your email" message instead of logging the user in
- Remove the logic that stores the access token on registration (none is returned)

### Confirm email page
- New route: `/auth/confirm-email` — reads `?token=` from query params, calls `GET /auth/confirm-email?token=xxx`
- On success: show "Email confirmed!" + link to login
- On 410: show "Link expired" + button to resend (calls `POST /auth/resend-confirmation`)
- On 400: show "Invalid or already used link"

### Resend confirmation
- Small "Resend confirmation email" form on the confirm-email page (just an email input)

---

## 6. Migration

```sql
-- migrations/006_email_confirmations.sql
CREATE TABLE email_confirmations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
    used_at     TIMESTAMPTZ
);
```

No changes to existing tables.

---

## 7. Files Touched

| File | Change |
|---|---|
| `api/email.py` | **New** — SMTP module, 3 send functions |
| `api/config.py` | Add 5 SMTP env vars |
| `api/routers/auth.py` | Register: set inactive, insert token, send email, no access token. Add confirm-email + resend endpoints |
| `api/routers/enquiries.py` | Call send functions after insert, catch SMTP errors |
| `migrations/006_email_confirmations.sql` | New table |
| `frontend/src/pages/auth/RegisterPage.tsx` | Show "check email" state instead of logging in |
| `frontend/src/pages/auth/ConfirmEmailPage.tsx` | **New** — handle token, success/error/resend states |
| `frontend/src/api/auth.ts` | Add `confirmEmail(token)` and `resendConfirmation(email)` API calls |
| `frontend/src/App.tsx` | Add `/auth/confirm-email` route |
