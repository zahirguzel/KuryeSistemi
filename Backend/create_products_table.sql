CREATE TABLE IF NOT EXISTS "Products" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "MerchantId" uuid NOT NULL,
    "Name" character varying(200) NOT NULL,
    "Category" character varying(100) NOT NULL,
    "Price" numeric(18,2) NOT NULL DEFAULT 0.00,
    "Description" character varying(1000),
    "IsAvailable" boolean NOT NULL DEFAULT true,
    "DisplayOrder" integer NOT NULL DEFAULT 0,
    "CreatedAt" timestamp with time zone NOT NULL,
    "CreatedBy" character varying(100) NOT NULL,
    "UpdatedAt" timestamp with time zone,
    "UpdatedBy" character varying(100),
    "IsDeleted" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_Products_Merchants_MerchantId" FOREIGN KEY ("MerchantId") REFERENCES "Merchants" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_Products_MerchantId" ON "Products" ("MerchantId");
CREATE INDEX IF NOT EXISTS "IX_Products_MerchantId_Category" ON "Products" ("MerchantId", "Category");
CREATE INDEX IF NOT EXISTS "IX_Products_MerchantId_IsAvailable" ON "Products" ("MerchantId", "IsAvailable");
