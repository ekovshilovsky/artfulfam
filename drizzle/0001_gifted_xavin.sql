ALTER TABLE "idk_printful_sync_product" ALTER COLUMN "printfulSyncProductId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "idk_printful_sync_product" ADD COLUMN "lastError" text;