-- ============================================================================
-- KuryeSistemi Multi-Tenant & Credit System Database Migration Script
-- ============================================================================

-- 1. CourierCompanies (Kurye Firmaları)
CREATE TABLE IF NOT EXISTS "CourierCompanies" (
    "Id" uuid NOT NULL,
    "Name" character varying(200) NOT NULL,
    "Email" character varying(150) NOT NULL,
    "PhoneNumber" character varying(20) NOT NULL,
    "Address" character varying(500) NOT NULL,
    "TaxNumber" character varying(20),
    "CreditBalance" integer NOT NULL DEFAULT 0,
    "CreditWarningThreshold" integer NOT NULL DEFAULT 100,
    "IsActive" boolean NOT NULL DEFAULT true,
    "BlockOnZeroCredit" boolean NOT NULL DEFAULT true,
    "LogoUrl" character varying(500),
    "CreatedAt" timestamp with time zone NOT NULL,
    "CreatedBy" character varying(100) NOT NULL,
    "UpdatedAt" timestamp with time zone,
    "UpdatedBy" character varying(100),
    "IsDeleted" boolean NOT NULL DEFAULT false,
    CONSTRAINT "PK_CourierCompanies" PRIMARY KEY ("Id"),
    CONSTRAINT "UQ_CourierCompanies_Email" UNIQUE ("Email")
);

-- 2. Merchants tablosuna CourierCompanyId sütununu ekle
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Merchants' AND column_name = 'CourierCompanyId'
    ) THEN
        ALTER TABLE "Merchants" ADD COLUMN "CourierCompanyId" uuid;
        ALTER TABLE "Merchants" ADD CONSTRAINT "FK_Merchants_CourierCompanies_CourierCompanyId"
            FOREIGN KEY ("CourierCompanyId") REFERENCES "CourierCompanies" ("Id") ON DELETE RESTRICT;
    END IF;
END $$;

-- 3. CompanyUsers (Firma Alt Kullanıcıları: Operatör, Muhasebeci, Destek, Yönetici)
CREATE TABLE IF NOT EXISTS "CompanyUsers" (
    "Id" uuid NOT NULL,
    "CourierCompanyId" uuid NOT NULL,
    "FirstName" character varying(100) NOT NULL,
    "LastName" character varying(100) NOT NULL,
    "Email" character varying(150) NOT NULL,
    "PasswordHash" character varying(500) NOT NULL,
    "PhoneNumber" character varying(20) NOT NULL,
    "Role" integer NOT NULL DEFAULT 1,
    "CanViewReports" boolean,
    "CanManageFinance" boolean,
    "CanManageCouriers" boolean,
    "CanManageOrders" boolean,
    "CanManageMerchants" boolean,
    "CanEditCompanySettings" boolean,
    "IsActive" boolean NOT NULL DEFAULT true,
    "LastLoginAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone NOT NULL,
    "CreatedBy" character varying(100) NOT NULL,
    "UpdatedAt" timestamp with time zone,
    "UpdatedBy" character varying(100),
    "IsDeleted" boolean NOT NULL DEFAULT false,
    CONSTRAINT "PK_CompanyUsers" PRIMARY KEY ("Id"),
    CONSTRAINT "UQ_CompanyUsers_Email" UNIQUE ("Email"),
    CONSTRAINT "FK_CompanyUsers_CourierCompanies_CourierCompanyId"
        FOREIGN KEY ("CourierCompanyId") REFERENCES "CourierCompanies" ("Id") ON DELETE RESTRICT
);

-- 4. CreditTransactions (Firma Kontör Hareket Defteri)
CREATE TABLE IF NOT EXISTS "CreditTransactions" (
    "Id" uuid NOT NULL,
    "CourierCompanyId" uuid NOT NULL,
    "Type" integer NOT NULL,
    "Amount" integer NOT NULL,
    "BalanceAfter" integer NOT NULL,
    "OrderId" uuid,
    "ReferenceNumber" character varying(100),
    "Notes" character varying(500),
    "CreatedAt" timestamp with time zone NOT NULL,
    "CreatedBy" character varying(100) NOT NULL,
    "UpdatedAt" timestamp with time zone,
    "UpdatedBy" character varying(100),
    "IsDeleted" boolean NOT NULL DEFAULT false,
    CONSTRAINT "PK_CreditTransactions" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_CreditTransactions_CourierCompanies_CourierCompanyId"
        FOREIGN KEY ("CourierCompanyId") REFERENCES "CourierCompanies" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_CreditTransactions_Orders_OrderId"
        FOREIGN KEY ("OrderId") REFERENCES "Orders" ("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_CreditTransactions_CompanyId" ON "CreditTransactions" ("CourierCompanyId");
CREATE INDEX IF NOT EXISTS "IX_CreditTransactions_OrderId" ON "CreditTransactions" ("OrderId");
CREATE INDEX IF NOT EXISTS "IX_CreditTransactions_CreatedAt" ON "CreditTransactions" ("CreatedAt");

-- 5. AdminUsers (Platform Süper Adminleri)
CREATE TABLE IF NOT EXISTS "AdminUsers" (
    "Id" uuid NOT NULL,
    "FullName" character varying(200) NOT NULL,
    "Email" character varying(150) NOT NULL,
    "PasswordHash" character varying(500) NOT NULL,
    "IsActive" boolean NOT NULL DEFAULT true,
    "LastLoginAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone NOT NULL,
    "CreatedBy" character varying(100) NOT NULL,
    "UpdatedAt" timestamp with time zone,
    "UpdatedBy" character varying(100),
    "IsDeleted" boolean NOT NULL DEFAULT false,
    CONSTRAINT "PK_AdminUsers" PRIMARY KEY ("Id"),
    CONSTRAINT "UQ_AdminUsers_Email" UNIQUE ("Email")
);

-- 6. Tohum Veri (Seed Data)
-- Süper Admin: admin@kuryesistemi.com / Şifre: 123456
INSERT INTO "AdminUsers" ("Id", "FullName", "Email", "PasswordHash", "IsActive", "CreatedAt", "CreatedBy", "IsDeleted")
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Süper Yönetici',
    'admin@kuryesistemi.com',
    '$2a$11$CAKbL1hjMnVOWH4QZ9yWdOw8mOgIk1oymrDVnmTMq9xAQo01XH3wS',
    true,
    NOW(),
    'system_seed',
    false
) ON CONFLICT ("Email") DO NOTHING;

-- Varsayılan Kurye Firması: Zahir Kurye & Lojistik A.Ş. (1000 Açılış Kontörü)
INSERT INTO "CourierCompanies" ("Id", "Name", "Email", "PhoneNumber", "Address", "CreditBalance", "CreditWarningThreshold", "IsActive", "BlockOnZeroCredit", "CreatedAt", "CreatedBy", "IsDeleted")
VALUES (
    '11111111-2222-3333-4444-555555555555',
    'Zahir Kurye & Lojistik A.Ş.',
    'info@zahirkurye.com',
    '05551112233',
    'İskenderun Merkez, Hatay',
    1000,
    100,
    true,
    true,
    NOW(),
    'system_seed',
    false
) ON CONFLICT ("Email") DO NOTHING;

-- İlk 1000 Kontör Girişi Kaydı
INSERT INTO "CreditTransactions" ("Id", "CourierCompanyId", "Type", "Amount", "BalanceAfter", "ReferenceNumber", "Notes", "CreatedAt", "CreatedBy", "IsDeleted")
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    '11111111-2222-3333-4444-555555555555',
    1, -- TopUp
    1000,
    1000,
    'SEED-INIT-1000',
    'Sistem ilk kurulum açılış kontör hediyesi',
    NOW(),
    'system_seed',
    false
) ON CONFLICT ("Id") DO NOTHING;

-- Firma Yöneticisi: manager@zahirkurye.com / Şifre: 123456
INSERT INTO "CompanyUsers" ("Id", "CourierCompanyId", "FirstName", "LastName", "Email", "PasswordHash", "PhoneNumber", "Role", "CanViewReports", "CanManageFinance", "CanManageCouriers", "CanManageOrders", "CanManageMerchants", "CanEditCompanySettings", "IsActive", "CreatedAt", "CreatedBy", "IsDeleted")
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    '11111111-2222-3333-4444-555555555555',
    'Zahir',
    'Yönetici',
    'manager@zahirkurye.com',
    '$2a$11$CAKbL1hjMnVOWH4QZ9yWdOw8mOgIk1oymrDVnmTMq9xAQo01XH3wS',
    '05551112233',
    0, -- Manager
    true, true, true, true, true, true,
    true,
    NOW(),
    'system_seed',
    false
) ON CONFLICT ("Email") DO NOTHING;

-- Mevcut işletmeleri bu varsayılan firmaya bağla (eğer henüz bağlanmamışlarsa)
UPDATE "Merchants"
SET "CourierCompanyId" = '11111111-2222-3333-4444-555555555555'
WHERE "CourierCompanyId" IS NULL;
