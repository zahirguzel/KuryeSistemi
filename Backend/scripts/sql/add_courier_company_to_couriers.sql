-- Migration: Add CourierCompanyId to Couriers, make MerchantId nullable

DO $$
BEGIN
    -- 1. CourierCompanyId sütunu ekle (varsa atla)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Couriers' AND column_name = 'CourierCompanyId'
    ) THEN
        ALTER TABLE "Couriers" ADD COLUMN "CourierCompanyId" uuid;
    END IF;

    -- 2. Mevcut kuryelerin CourierCompanyId değerini bağlı oldukları işletmeden (veya sistemdeki ilk kurye firmasından) doldur
    UPDATE "Couriers" 
    SET "CourierCompanyId" = COALESCE(
        (SELECT "CourierCompanyId" FROM "Merchants" WHERE "Merchants"."Id" = "Couriers"."MerchantId"), 
        (SELECT "Id" FROM "CourierCompanies" ORDER BY "CreatedAt" ASC LIMIT 1)
    )
    WHERE "CourierCompanyId" IS NULL;

    -- 3. CourierCompanyId sütununu NOT NULL yap
    ALTER TABLE "Couriers" ALTER COLUMN "CourierCompanyId" SET NOT NULL;

    -- 4. Foreign Key ekle (varsa atla)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_Couriers_CourierCompanies_CourierCompanyId'
    ) THEN
        ALTER TABLE "Couriers" 
        ADD CONSTRAINT "FK_Couriers_CourierCompanies_CourierCompanyId" 
        FOREIGN KEY ("CourierCompanyId") REFERENCES "CourierCompanies" ("Id") ON DELETE RESTRICT;
    END IF;

    -- 5. Index ekle (varsa atla)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'IX_Couriers_CourierCompanyId'
    ) THEN
        CREATE INDEX "IX_Couriers_CourierCompanyId" ON "Couriers" ("CourierCompanyId");
    END IF;

    -- 6. MerchantId sütununu NULLABLE (isteğe bağlı) yap
    ALTER TABLE "Couriers" ALTER COLUMN "MerchantId" DROP NOT NULL;

    -- 7. Firmanın kendi hesabına (Role = 'CourierFirm') bağlı kuryeler "ortak filo" kuryesidir -> MerchantId = NULL
    --    (aksi halde "başka bir işletmeye özel tahsis" sayılıp diğer restoranların siparişlerine atanamazlar)
    UPDATE "Couriers"
    SET "MerchantId" = NULL
    WHERE "MerchantId" IN (SELECT "Id" FROM "Merchants" WHERE "Role" = 'CourierFirm');

END $$;
