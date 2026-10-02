SET client_encoding = 'UTF8';

DELETE FROM "CashSettlements";
DELETE FROM "Orders";

-- Kurye 1 (Ahmet Yılmaz)
UPDATE "Couriers" 
SET "FirstName" = 'Ahmet',
    "LastName" = 'Yılmaz',
    "IsOnline" = true,
    "IsAvailable" = false,
    "CurrentLatitude" = 36.5885,
    "CurrentLongitude" = 36.1725,
    "CurrentBalance" = 120.00
WHERE "Id" = '90386627-9816-4d9d-8def-eaee73e39b15';

-- Kurye 2 (Burak Demir)
INSERT INTO "Couriers" ("Id", "MerchantId", "FirstName", "LastName", "PhoneNumber", "Email", "VehicleType", "LicensePlate", "VehicleBrand", "VehicleModel", "IsAvailable", "IsOnline", "CurrentLatitude", "CurrentLongitude", "CurrentBalance", "CreatedAt", "CreatedBy", "IsDeleted", "PasswordHash")
VALUES (
    '81111111-1111-1111-1111-111111111111',
    '500d7a83-0f7a-498d-8480-83e87cc7762d',
    'Burak',
    'Demir',
    '05321112233',
    'burak@kurye.com',
    'Motorcycle',
    '31 KRY 02',
    'Honda',
    'PCX 125',
    false,
    true,
    36.5842,
    36.1680,
    80.00,
    NOW(),
    'system',
    false,
    ''
) ON CONFLICT ("Id") DO UPDATE 
SET "FirstName" = 'Burak', "LastName" = 'Demir', "IsOnline" = true, "IsAvailable" = false, "CurrentLatitude" = 36.5842, "CurrentLongitude" = 36.1680;

-- Kurye 3 (Emre Çelik) - Müsait / Boşta
INSERT INTO "Couriers" ("Id", "MerchantId", "FirstName", "LastName", "PhoneNumber", "Email", "VehicleType", "LicensePlate", "VehicleBrand", "VehicleModel", "IsAvailable", "IsOnline", "CurrentLatitude", "CurrentLongitude", "CurrentBalance", "CreatedAt", "CreatedBy", "IsDeleted", "PasswordHash")
VALUES (
    '82222222-2222-2222-2222-222222222222',
    '500d7a83-0f7a-498d-8480-83e87cc7762d',
    'Emre',
    'Çelik',
    '05322223344',
    'emre@kurye.com',
    'Motorcycle',
    '31 KRY 03',
    'Yamaha',
    'NMAX 155',
    true,
    true,
    36.5740,
    36.1550,
    200.00,
    NOW(),
    'system',
    false,
    ''
) ON CONFLICT ("Id") DO UPDATE 
SET "FirstName" = 'Emre', "LastName" = 'Çelik', "IsOnline" = true, "IsAvailable" = true, "CurrentLatitude" = 36.5740, "CurrentLongitude" = 36.1550;

-- Sipariş 1: Hazırlanıyor (Trendyol Yemek)
INSERT INTO "Orders" (
    "Id", "MerchantId", "CourierId", "PickupAddressLine", "PickupDistrict", "PickupCity", "PickupLatitude", "PickupLongitude",
    "DeliveryAddressLine", "DeliveryDistrict", "DeliveryCity", "DeliveryLatitude", "DeliveryLongitude",
    "RecipientName", "RecipientPhone", "Notes", "Status", "PaymentMethod", "TotalOrderAmount", "CourierEarning",
    "OrderCode", "Source", "DeliveryNeighborhood", "EstimatedDistanceKm", "EstimatedDeliveryMinutes",
    "CreatedAt", "CreatedBy", "IsDeleted"
) VALUES (
    'a1111111-1111-1111-1111-111111111111',
    '804c1bbd-70cf-47ae-8056-19c58d1deada',
    NULL,
    'İsmet İnönü Mah. Atatürk Bulvarı No: 42/B', 'İskenderun', 'Hatay', 36.570268, 36.118898,
    'Karaağaç Mah. 124. Sokak No: 8 Daire: 4', 'İskenderun', 'Hatay', 36.578000, 36.160000,
    'Ali Vural', '05301234567', 'Zil çalmayın lütfen, bebek uyuyor', 'Preparing', 'Online', 240.00, 45.00,
    'TY-8492', 'Trendyol', 'Karaağaç', 2.8, 20,
    NOW() - INTERVAL '12 minutes', 'system', false
);

-- Sipariş 2: Paket Hazır (Yemeksepeti)
INSERT INTO "Orders" (
    "Id", "MerchantId", "CourierId", "PickupAddressLine", "PickupDistrict", "PickupCity", "PickupLatitude", "PickupLongitude",
    "DeliveryAddressLine", "DeliveryDistrict", "DeliveryCity", "DeliveryLatitude", "DeliveryLongitude",
    "RecipientName", "RecipientPhone", "Notes", "Status", "PaymentMethod", "TotalOrderAmount", "CourierEarning",
    "OrderCode", "Source", "DeliveryNeighborhood", "EstimatedDistanceKm", "EstimatedDeliveryMinutes",
    "CreatedAt", "CreatedBy", "IsDeleted"
) VALUES (
    'a2222222-2222-2222-2222-222222222222',
    '989a727e-3119-4cb4-9269-fd597e8ed00a',
    NULL,
    'İsmet İnönü Mah. Atatürk Bulvarı No: 42/B', 'İskenderun', 'Hatay', 36.562969, 36.152467,
    'Numune Mah. 182. Sokak Güneş Apt. No: 12', 'İskenderun', 'Hatay', 36.582000, 36.175000,
    'Merve Kaya', '05419876543', 'Sıcak teslim edilsin, turşu bol olsun', 'Ready', 'Online', 310.00, 45.00,
    'YS-3190', 'Yemeksepeti', 'Numune', 3.4, 25,
    NOW() - INTERVAL '8 minutes', 'system', false
);

-- Sipariş 3: Kurye Atandı (Telefon Siparişi POS) -> Ahmet Yılmaz
INSERT INTO "Orders" (
    "Id", "MerchantId", "CourierId", "PickupAddressLine", "PickupDistrict", "PickupCity", "PickupLatitude", "PickupLongitude",
    "DeliveryAddressLine", "DeliveryDistrict", "DeliveryCity", "DeliveryLatitude", "DeliveryLongitude",
    "RecipientName", "RecipientPhone", "Notes", "Status", "PaymentMethod", "TotalOrderAmount", "CourierEarning",
    "OrderCode", "Source", "DeliveryNeighborhood", "EstimatedDistanceKm", "EstimatedDeliveryMinutes", "AssignedAt",
    "CreatedAt", "CreatedBy", "IsDeleted"
) VALUES (
    'a3333333-3333-3333-3333-333333333333',
    '804c1bbd-70cf-47ae-8056-19c58d1deada',
    '90386627-9816-4d9d-8def-eaee73e39b15',
    'İsmet İnönü Mah. Atatürk Bulvarı No: 42/B', 'İskenderun', 'Hatay', 36.570268, 36.118898,
    'Çarşı Mah. Mithat Paşa Cad. No: 45 Kat: 2', 'İskenderun', 'Hatay', 36.589000, 36.169000,
    'Serkan Özdemir', '05353334455', 'Nakit 200 TL verilecek, para üstü hazır olsun', 'Assigned', 'Cash', 185.00, 40.00,
    'POS-1042', 'Phone', 'Çarşı', 1.9, 15, NOW() - INTERVAL '5 minutes',
    NOW() - INTERVAL '15 minutes', 'system', false
);

-- Sipariş 4: Yolda (Trendyol Yemek) -> Burak Demir
INSERT INTO "Orders" (
    "Id", "MerchantId", "CourierId", "PickupAddressLine", "PickupDistrict", "PickupCity", "PickupLatitude", "PickupLongitude",
    "DeliveryAddressLine", "DeliveryDistrict", "DeliveryCity", "DeliveryLatitude", "DeliveryLongitude",
    "RecipientName", "RecipientPhone", "Notes", "Status", "PaymentMethod", "TotalOrderAmount", "CourierEarning",
    "OrderCode", "Source", "DeliveryNeighborhood", "EstimatedDistanceKm", "EstimatedDeliveryMinutes", "AssignedAt", "PickedUpAt",
    "CreatedAt", "CreatedBy", "IsDeleted"
) VALUES (
    'a4444444-4444-4444-4444-444444444444',
    '989a727e-3119-4cb4-9269-fd597e8ed00a',
    '81111111-1111-1111-1111-111111111111',
    'İsmet İnönü Mah. Atatürk Bulvarı No: 42/B', 'İskenderun', 'Hatay', 36.562969, 36.152467,
    'İsmet İnönü Mah. 201. Sokak Palmiye Sitesi B Blok', 'İskenderun', 'Hatay', 36.565000, 36.151000,
    'Fatma Şahin', '05387778899', 'Kapıda kredi kartı ile ödenecek', 'PickedUp', 'CreditCardOnDelivery', 420.00, 45.00,
    'TY-7721', 'Trendyol', 'İsmet İnönü', 1.2, 10, NOW() - INTERVAL '18 minutes', NOW() - INTERVAL '6 minutes',
    NOW() - INTERVAL '22 minutes', 'system', false
);

-- Sipariş 5: Bekliyor / Havuz (Yemeksepeti)
INSERT INTO "Orders" (
    "Id", "MerchantId", "CourierId", "PickupAddressLine", "PickupDistrict", "PickupCity", "PickupLatitude", "PickupLongitude",
    "DeliveryAddressLine", "DeliveryDistrict", "DeliveryCity", "DeliveryLatitude", "DeliveryLongitude",
    "RecipientName", "RecipientPhone", "Notes", "Status", "PaymentMethod", "TotalOrderAmount", "CourierEarning",
    "OrderCode", "Source", "DeliveryNeighborhood", "EstimatedDistanceKm", "EstimatedDeliveryMinutes",
    "CreatedAt", "CreatedBy", "IsDeleted"
) VALUES (
    'a5555555-5555-5555-5555-555555555555',
    '804c1bbd-70cf-47ae-8056-19c58d1deada',
    NULL,
    'İsmet İnönü Mah. Atatürk Bulvarı No: 42/B', 'İskenderun', 'Hatay', 36.570268, 36.118898,
    'Dumlupınar Mah. Barış Cad. Özlem Apt. No: 7', 'İskenderun', 'Hatay', 36.584000, 36.162000,
    'Hakan Demir', '05445556677', 'Temassız teslimat, kapıya bırakabilirsiniz', 'Pending', 'Online', 160.00, 40.00,
    'YS-9923', 'Yemeksepeti', 'Dumlupınar', 2.1, 20,
    NOW() - INTERVAL '3 minutes', 'system', false
);
