-- ============================================================================
-- Firmaya bağlanmamış (eski) işletmeleri bir kurye firmasına bağlar.
--
-- NEDEN: Merchants.CourierCompanyId daha önce hiçbir yerde doldurulmuyordu.
-- Artık yeni işletmeler, oluşturan firma kullanıcısının firmasına otomatik bağlanıyor.
-- Eski kayıtlar NULL kaldığı sürece "ortak/eski" kabul edilir ve tüm firmalar görebilir.
-- Gerçek tenant izolasyonu için aşağıdaki sorguyu BİR KEZ çalıştırın.
--
-- 1) Firma Id'sini öğrenin:
--      SELECT "Id", "Name" FROM "CourierCompanies";
-- 2) <FIRMA-ID> yerine yazıp çalıştırın (tek firmalı kurulumda tüm eski işletmeler o firmanındır):
-- ============================================================================
UPDATE "Merchants"
SET "CourierCompanyId" = '<FIRMA-ID>'
WHERE "CourierCompanyId" IS NULL
  AND "Role" <> 'CourierFirm'
  AND "IsDeleted" = false;
