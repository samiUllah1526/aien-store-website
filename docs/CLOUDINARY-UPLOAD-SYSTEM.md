# Cloudinary File Upload System

> **Superseded by** [MEDIA-UPLOAD-SYSTEM.md](./MEDIA-UPLOAD-SYSTEM.md) — the system is now provider-agnostic. Cloudinary remains the default implementation.

Production-ready direct-to-CDN upload system for the Aien store. Files are uploaded directly from the browser to Cloudinary; the application server never handles file bytes.

## Architecture

```
[Browser] --1. GET signed params--> [Backend API]
[Browser] --2. POST file + params--> [Cloudinary] (direct)
[Browser] --3. POST register--> [Backend API] --> [PostgreSQL]
```

- **Step 1**: Frontend requests signed upload parameters (JWT required for products; public for payment proof).
- **Step 2**: Frontend POSTs the file directly to Cloudinary with the signed params. Cloudinary validates and stores.
- **Step 3**: Frontend calls our register endpoint with `publicId`, `secureUrl`, etc. We create a `Media` record and return the id.

## Security

### Credentials
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` are **never** exposed to the frontend.
- Signed upload params include a short-lived signature and timestamp. Cloudinary validates server-side.

### Validation
- **File type**: JPEG, PNG, WebP, GIF only.
- **Size**: Max 5MB (configurable in `cloudinary.service.ts`).
- **Access control**:
  - **Products**: `GET /media/cloudinary/signed-params` and `POST /media/cloudinary/register` require JWT + `products:write`.
  - **Payment proof**: `GET /media/cloudinary/signed-params-payment-proof` and `POST /media/cloudinary/register-payment-proof` are public but rate-limited by `ThrottlerGuard`.

### Sanitization
- Filenames are sanitized before storage (path separators, control chars removed).
- Metadata from Cloudinary response is stored as-is; we trust Cloudinary validation.

## Database Schema

`Media` table additions:
- `cloudinary_public_id` – Cloudinary asset ID (e.g. `products/abc123`).
- `cloudinary_secure_url` – Full HTTPS URL for delivery.
- `source` – `product` or `payment_proof` for association and cleanup.

When `cloudinary_secure_url` is set, products and orders use it directly. Legacy disk-stored media still use `path` via `/media/file/:folder/:filename`.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/media/cloudinary/signed-params?folder=products` | JWT + products:write | Signed params for product images |
| POST | `/media/cloudinary/register` | JWT + products:write | Register product image after upload |
| GET | `/media/cloudinary/signed-params-payment-proof` | Public | Signed params for payment proof |
| POST | `/media/cloudinary/register-payment-proof` | Public | Register payment proof after upload |

Legacy endpoints (`POST /media/upload`, `POST /media/upload-payment-proof`) remain for fallback when Cloudinary is not configured.

## Frontend Integration

### Admin Portal (ProductForm)
- Tries Cloudinary upload first; falls back to legacy if Cloudinary is not configured.
- Progress feedback during upload.
- Thumbnail previews for uploaded images.

### Main Website (CheckoutForm)
- Payment proof: tries `uploadPaymentProofToCloudinary`; falls back to legacy `uploadPaymentProof`.

### Image Optimization (Astro)
- `main-website/src/lib/image-optimize.ts`: Utilities to inject Cloudinary transforms (resize, quality, format).
- `CloudinaryImage.tsx`: Wrapper component for responsive, optimized images.

## Orphan Cleanup Strategy

Cloudinary assets can become orphaned when:
- A product is deleted but its Media records are cascade-deleted (ProductMedia FK) – Cloudinary assets remain.
- A user uploads but never completes checkout – payment proof in Cloudinary is never linked to an order.
- Media is replaced on a product – old Cloudinary asset is no longer referenced.

### Recommended Cleanup

1. **Scheduled job (cron)**  
   - Query `Media` for records with `cloudinary_public_id` that are:
     - Not in `ProductMedia` (product images)
     - Not in `Order.paymentProofMediaId` (payment proofs)
   - Optionally: not modified in last N days (grace period).
   - Call Cloudinary Admin API `delete_resources` for those public IDs.
   - Delete the `Media` rows (or mark as deleted).

2. **Cloudinary lifecycle rules**  
   - Use Cloudinary’s optional auto-delete rules for assets older than X days in specific folders, if acceptable.

3. **Manual audit**  
   - Periodic report of Media rows with `cloudinary_public_id` that have no ProductMedia or Order link.

### Example cleanup query

```sql
-- Orphan product images (media with source=product not linked to any product)
SELECT m.id, m.cloudinary_public_id
FROM media m
LEFT JOIN product_media pm ON pm.media_id = m.id
WHERE m.cloudinary_public_id IS NOT NULL
  AND m.source = 'product'
  AND pm.media_id IS NULL;
```

## Environment Variables

### Backend
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

If these are not set, the Cloudinary endpoints return 400. Frontends fall back to legacy upload.

## Best Practices

1. **Never expose API secret** – Only the backend generates signatures.
2. **Use signed uploads** – Avoid unsigned presets for production.
3. **Validate on both sides** – Backend validates via signed params; frontend validates before upload for UX.
4. **Handle failures** – Frontend retries and clear error messages; backend idempotent register where possible.
5. **Monitor usage** – Cloudinary dashboard for storage and bandwidth.
