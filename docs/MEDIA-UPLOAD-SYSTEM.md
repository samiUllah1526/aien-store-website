# Media Upload System (Provider-Agnostic)

Production-ready file upload system with **provider-agnostic** design. Swap Cloudinary for AWS S3 or another provider without changing the database schema or API contract.

## Architecture

```
[Browser] --1. GET /media/upload-params--> [Backend]
[Browser] --2. POST file + params--> [Provider: Cloudinary | S3 | ...] (direct)
[Browser] --3. POST /media/register--> [Backend] --> [PostgreSQL]
```

- **Step 1**: Frontend requests signed upload parameters. Backend returns provider-agnostic shape.
- **Step 2**: Frontend POSTs file directly to the provider's URL (no file bytes through our server).
- **Step 3**: Frontend registers the upload with our API; we store metadata and return media id.

## Database Schema (Provider-Agnostic)

```prisma
model Media {
  path           String   // Local path or storage key
  storageProvider String? // 'local' | 'cloudinary' | 's3'
  storageKey     String?  // Provider's ID (public_id, S3 key, etc.)
  deliveryUrl    String?  // Full HTTPS URL for delivery
  source         String?  // 'product' | 'payment_proof'
  // ...
}
```

- **storageProvider**: Which backend stored the file. Enables easy migration.
- **storageKey**: Provider's identifier (Cloudinary `public_id`, S3 object key).
- **deliveryUrl**: Full URL for `<img src>`. Works for any CDN.

## Storage Provider Abstraction

```
IStorageProvider
  ├── getSignedUploadParams(folder): SignedUploadParams
  ├── parseUploadResponse(response): RegisterUploadPayload
  └── type: 'cloudinary' | 's3' | 'local'

Implementations:
  ├── CloudinaryStorageProvider (default)
  ├── S3StorageProvider (add when needed)
  └── LocalStorageProvider (legacy disk upload)
```

To add S3:
1. Create `S3StorageProvider` implementing `IStorageProvider`
2. Register in `StorageProviderFactory`
3. Set `STORAGE_PROVIDER=s3` and S3 env vars

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/media/upload-params?folder=products` | JWT + products:write | Signed params for product images |
| POST | `/media/register` | JWT + products:write | Register product image |
| GET | `/media/upload-params-payment-proof` | Public | Signed params for payment proof |
| POST | `/media/register-payment-proof` | Public | Register payment proof |
| POST | `/media/upload` | JWT + products:write | Legacy: server upload (when no remote) |
| POST | `/media/upload-payment-proof` | Public | Legacy: server upload |

### Register Payload (Provider-Agnostic)

```json
{
  "provider": "cloudinary",
  "providerResponse": { "public_id": "...", "secure_url": "..." }
}
```

Or normalized:
```json
{
  "provider": "cloudinary",
  "storageKey": "products/abc123",
  "deliveryUrl": "https://res.cloudinary.com/..."
}
```

## Environment Variables

```env
# Storage provider: cloudinary | s3 | local
STORAGE_PROVIDER=cloudinary

# Cloudinary (when using cloudinary)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Migration to S3 (or Another Provider)

1. Implement `S3StorageProvider` with `getSignedUploadParams` (presigned URL) and `parseUploadResponse`.
2. Add to `StorageProviderFactory`.
3. Set `STORAGE_PROVIDER=s3`.
4. **No database changes.** Existing `deliveryUrl` for Cloudinary assets keep working.
5. New uploads use S3; old Cloudinary URLs remain valid.

## Image Optimization

`main-website/src/lib/image-optimize.ts` supports multiple providers:

- **Cloudinary**: URL path transforms (`w_400`, `c_fill`, `f_auto`)
- **S3/imgix**: Add `isOptimizableUrl` and transform logic when implemented
- **Unknown URLs**: Pass-through

## Orphan Cleanup

Query orphaned remote assets:

```sql
SELECT id, storage_key, storage_provider
FROM media
WHERE storage_provider IS NOT NULL
  AND id NOT IN (SELECT media_id FROM product_media)
  AND id NOT IN (SELECT payment_proof_media_id FROM orders WHERE payment_proof_media_id IS NOT NULL);
```

Delete via provider's API (Cloudinary Admin API, S3 delete, etc.).
