-- CreateTable
CREATE TABLE "customer_spotlight_items" (
    "id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_spotlight_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_spotlight_items_is_active_sort_order_idx" ON "customer_spotlight_items"("is_active", "sort_order");

-- AddForeignKey
ALTER TABLE "customer_spotlight_items" ADD CONSTRAINT "customer_spotlight_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
