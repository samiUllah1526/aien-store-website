-- AlterTable: allow NULL password_hash for Google OAuth-only users; add google_id for linking.
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_key" ON "users"("google_id");
