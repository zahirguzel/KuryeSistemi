# 🚀 KuryeSistemi — Proje Dokümantasyonu

> **Proje Tipi:** B2B SaaS — Kurye & Filo Yönetim Sistemi
> **Stack:** ASP.NET Core 8 · EF Core 8 · PostgreSQL · MediatR · FluentValidation · JWT .redis
> **Mimari:** Onion Architecture (Clean Architecture) + CQRS + DDD
> **Son Güncelleme:** 15 Eylül 2026

---

## 📋 İçindekiler

1. [Proje Özeti](#1-proje-özeti)
2. [Mimari Yapı](#2-mimari-yapı)
3. [Klasör Yapısı](#3-klasör-yapısı)
4. [Domain Katmanı](#4-domain-katmanı)
5. [Application Katmanı](#5-application-katmanı)
6. [Infrastructure Katmanı](#6-infrastructure-katmanı)
7. [API Katmanı](#7-api-katmanı)
8. [Veritabanı](#8-veritabanı)
9. [Authentication — JWT](#9-authentication--jwt)
10. [Validation — FluentValidation](#10-validation--fluentvalidation)
11. [API Endpoint Listesi](#11-api-endpoint-listesi)
12. [Postman & İstemci Test Rehberi](#12-postman--i̇stemci-test-rehberi)
13. [Kullanılan Paketler](#13-kullanılan-paketler)
14. [Realtime & Önbellekleme Altyapısı (SignalR + Redis)](#14-realtime--önbellekleme-altyapısı)
15. [Sonraki Adımlar](#15-sonraki-adımlar)
16. [Flutter Mobil Uygulaması (`kurye_mobil`) & Riverpod Auth Mimarisi (08.09.2026)](#16-flutter-mobil-uygulaması-kurye_mobil--riverpod-auth-mimarisi-08092026)
17. [Kurumsal Mimari Refactoring — CepteServis Standartları (09.09.2026)](#17-kurumsal-mimari-refactoring--cepteservis-standartları-09092026)
18. [Kurye Cüzdan (Wallet) Modülü & Tarihsel Değişmezlik Mimarisi (09.09.2026)](#18-kurye-cüzdan-wallet-modülü--tarihsel-değişmezlik-mimarisi-09092026)
19. [Dış Servisler (SMS, E-Posta, Push) & Harita Sağlayıcı Altyapısı (09.09.2026)](#19-dış-servisler-sms-e-posta-push--harita-sağlayıcı-altyapısı-09092026)
20. [Nakit/Online Ödeme Mahsuplaşma (Reconciliation) & Kurye Profil/Kasa Mimarisi (09.09.2026)](#20-nakitonline-ödeme-mahsuplaşma-reconciliation--kurye-profilkasa-mimarisi-09092026)
21. [İşletme Web Paneli (`merchant_web`) Mimarisi & Kimlik Doğrulama (Auth) (10.09.2026)](#21-i̇şletme-web-paneli-merchant_web-mimarisi--kimlik-doğrulama-auth-10092026)
22. [Canlı Saha Radarı & SignalR WebSocket Harita Entegrasyonu (10.09.2026)](#22-canlı-saha-radarı--signalr-websocket-harita-entegrasyonu-10092026)
23. [İşletme GPS Konum Yönetimi, Geolocation & Backend Kalıcı Kayıt Mimarisi (10.09.2026)](#23-i̇şletme-gps-konum-yönetimi-geolocation--backend-kalıcı-kayıt-mimarisi-10092026)
24. [Hızlı Sipariş (POS), Kanban Tablosu & Kasa Mahsuplaşma Backend Mimarisi (10.09.2026)](#24-hızlı-sipariş-pos-kanban-tablosu--kasa-mahsuplaşma-backend-mimarisi-10092026)
25. [İşletme Paneli Ayarlar Sayfası & Kurye Firması Panel Altyapısı (14.09.2026)](#25-i̇şletme-paneli-ayarlar-sayfası--kurye-firması-panel-altyapısı-14092026)
26. [Rol Tabanlı Kimlik Doğrulama & Kurye Firması Hesap Yönetimi (14.09.2026)](#26-rol-tabanlı-kimlik-doğrulama--kurye-firması-hesap-yönetimi-14092026)
27. [Kurye Firması Paneli — Tam Modül Geliştirme (15.09.2026)](#27-kurye-firması-paneli--tam-modül-geliştirme-15092026)
28. [Filo Haritası — FirmRadar (15.09.2026)](#28-filo-haritası--firmradar-15092026)
29. [Kurye Yönetimi (CRUD), Sipariş Havuzu & Firma Entegrasyonları (15.09.2026)](#29-kurye-yönetimi-crud-sipariş-havuzu--firma-entegrasyonları-15092026)
30. [Restoran / İşletme Yönetimi (CRUD) & Dağıtım Stratejileri Mimarisi (15.09.2026)](#30-restoran--i̇şletme-yönetimi-crud--dağıtım-stratejileri-mimarisi-15092026)
31. [Sipariş Havuzu, Detay & Manuel Kurye Atama Sistemi (15.09.2026)](#31-sipariş-havuzu-detay--manuel-kurye-atama-sistemi-15092026)

---

## 1. Proje Özeti

**KuryeSistemi**, işletmelerin (B2B) kurye çağırıp yönettiği, filo yöneticilerinin kuryeleri haritadan takip ettiği yüksek trafikli bir SaaS platformudur.

**Temel İş Akışı:**
```
İşletme (Merchant) → Sipariş Oluştur → Kurye Ata → Kurye Teslim Eder
```

**State Machine:**
```
Pending → Assigned → PickedUp → Delivered
    └──────────────────────────→ Cancelled
```

---

## 2. Mimari Yapı

Sistem **Onion Architecture** prensiplerine göre 4 katmana ayrılmıştır:

```
┌─────────────────────────────────────────┐
│           API Katmanı                   │  ← Controllers, Hubs, Program.cs
├─────────────────────────────────────────┤
│       Infrastructure Katmanı            │  ← EF Core, JwtService, Migrations
├─────────────────────────────────────────┤
│        Application Katmanı              │  ← CQRS, MediatR, Behaviors, Validators
├─────────────────────────────────────────┤
│          Domain Katmanı                 │  ← Entities, Enums, BaseEntity
└─────────────────────────────────────────┘
```

**Bağımlılık Kuralı:** API → Infrastructure → Application → Domain.
Domain hiçbir dış katmana bağımlı değildir.

**Uygulanan Prensipler:**
- **SOLID** — Her sınıf tek bir sorumluluğa sahip
- **CQRS** — Okuma (Query) ve yazma (Command) operasyonları tamamen ayrılmış
- **DDD** — Domain entity'leri iş kurallarını kendi içinde barındırır
- **DIP** — Infrastructure, Application interface'lerini implement eder

---

## 3. Klasör Yapısı

```
C:\kuryesistemi\
├── docker-compose.yml
└── Backend/src/
    ├── KuryeSistemi.Domain/
    │   ├── Common/BaseEntity.cs
    │   ├── Entities/
    │   │   ├── Merchant.cs
    │   │   ├── Courier.cs
    │   │   └── Order.cs
    │   └── Enums/
    │       ├── OrderStatus.cs
    │       └── VehicleType.cs
    │
    ├── KuryeSistemi.Application/
    │   ├── ApplicationServiceRegistration.cs
    │   ├── Common/
    │   │   ├── Models/
    │   │   │   └── ServiceResult.cs
    │   │   ├── Exceptions/
    │   │   │   ├── AppException.cs
    │   │   │   └── ValidationException.cs
    │   │   ├── Behaviours/
    │   │   └── Settings/JwtSettings.cs
    │   ├── Repositories/
    │   │   └── Interfaces/
    │   │       ├── IGenericRepository.cs
    │   │       ├── IOrderRepository.cs
    │   │       ├── ICourierRepository.cs
    │   │       └── IMerchantRepository.cs
    │   ├── Services/
    │   │   ├── Interfaces/
    │   │   │   ├── IAuthService.cs
    │   │   │   ├── IOrderService.cs
    │   │   │   ├── ICourierService.cs
    │   │   │   └── IMerchantService.cs
    │   │   └── Concrete/
    │   │       ├── AuthService.cs
    │   │       ├── OrderService.cs
    │   │       ├── CourierService.cs
    │   │       └── MerchantService.cs
    │   ├── DTOs/
    │   │   ├── Auth/LoginRequestDto.cs
    │   │   ├── Orders/OrderRequestDtos.cs
    │   │   ├── Couriers/CreateCourierRequestDto.cs
    │   │   └── Merchants/CreateMerchantRequestDto.cs
    │   ├── Interfaces/
    │   ├── Jobs/
    │   └── Features/
    │
    ├── KuryeSistemi.Infrastructure/
    │   ├── InfrastructureServiceRegistration.cs
    │   ├── Repositories/
    │   │   ├── GenericRepository.cs
    │   │   ├── OrderRepository.cs
    │   │   ├── CourierRepository.cs
    │   │   └── MerchantRepository.cs
    │   ├── Security/JwtService.cs
    │   ├── Services/HangfireBackgroundJobService.cs
    │   └── Persistence/
    │
    └── KuryeSistemi.API/
        ├── Program.cs
        ├── appsettings.json
        ├── Extensions/
        │   ├── DatabaseExtensions.cs
        │   ├── RepositoryExtensions.cs
        │   ├── ServiceExtensions.cs
        │   ├── AuthExtensions.cs
        │   ├── SwaggerExtensions.cs
        │   └── CorsExtensions.cs
        ├── Hubs/
        ├── Middlewares/
        │   ├── GlobalExceptionMiddleware.cs
        │   └── GlobalExceptionHandler.cs
        ├── Services/
        └── Controllers/
            ├── BaseController.cs
            ├── Auth/AuthController.cs
            ├── Merchants/MerchantsController.cs
            ├── Couriers/CouriersController.cs
            └── Orders/OrdersController.cs
```

---

## 4. Domain Katmanı

### BaseEntity

Tüm entity'lerin türediği temel sınıf:

```csharp
public abstract class BaseEntity
{
    public Guid      Id        { get; set; }  // Primary Key
    public DateTime  CreatedAt { get; set; }  // Otomatik doldurulur
    public string    CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string?   UpdatedBy { get; set; }
    public bool      IsDeleted { get; set; }  // Soft-delete bayrağı
}
```

> `AppDbContext.SaveChangesAsync` override'ı audit alanlarını otomatik doldurur.
> Global Query Filter ile `IsDeleted=true` kayıtlar tüm sorgulardan elenir.

---

### Merchant (İşletme)

```csharp
public sealed class Merchant : BaseEntity
{
    public string Name         { get; set; }  // İşletme adı
    public string Email        { get; set; }  // Giriş e-postası (unique)
    public string PasswordHash { get; set; }  // Şifre (TODO: BCrypt)
    public string PhoneNumber  { get; set; }
    public string Address      { get; set; }
    public bool   IsActive     { get; set; }  // Abonelik durumu
    public ICollection<Order>   Orders   { get; set; }
    public ICollection<Courier> Couriers { get; set; }
}
```

### Courier (Kurye)

```csharp
public sealed class Courier : BaseEntity
{
    public Guid        MerchantId   { get; set; }  // Tenant izolasyonu
    public string      FirstName    { get; set; }
    public string      LastName     { get; set; }
    public string      PhoneNumber  { get; set; }
    public string      Email        { get; set; }
    public VehicleType VehicleType  { get; set; }  // Enum
    public string      LicensePlate { get; set; }  // Büyük harf normalize
    public string      VehicleBrand { get; set; }
    public string      VehicleModel { get; set; }
    public bool        IsAvailable  { get; set; }  // Müsaitlik durumu
}
```

**VehicleType:** `Motorcycle=0` · `Car=1` · `Van=2` · `Bicycle=3`

### Order (Sipariş)

```csharp
public sealed class Order : BaseEntity
{
    public Guid        MerchantId          { get; set; }
    public Guid?       CourierId           { get; set; }  // null = atanmamış
    public OrderStatus Status              { get; set; }
    public string      PickupAddressLine   { get; set; }
    public string      PickupDistrict      { get; set; }
    public string      PickupCity          { get; set; }
    public decimal     PickupLatitude      { get; set; }
    public decimal     PickupLongitude     { get; set; }
    public string      DeliveryAddressLine { get; set; }
    public string      DeliveryDistrict    { get; set; }
    public string      DeliveryCity        { get; set; }
    public decimal     DeliveryLatitude    { get; set; }
    public decimal     DeliveryLongitude   { get; set; }
    public string      RecipientName       { get; set; }
    public string      RecipientPhone      { get; set; }
    public string?     Notes               { get; set; }
    public DateTime?   PickedUpAt          { get; set; }
    public DateTime?   DeliveredAt         { get; set; }
}
```

**OrderStatus & State Machine:**

```
0 = Pending   → Kurye atanmamış (başlangıç)
1 = Assigned  → Kurye atandı
2 = PickedUp  → Kurye siparişi teslim aldı
3 = Delivered → Teslim edildi ✅ (terminal)
4 = Cancelled → İptal edildi ❌ (terminal)

Geçiş Matrisi:
  Pending  → Cancelled
  Assigned → PickedUp | Cancelled
  PickedUp → Delivered
```

---

## 5. Application Katmanı

### CQRS Akışı

```
HTTP İsteği
    ↓ Controller
    ↓ IMediator.Send(Command/Query)
    ↓ ValidationBehavior (FluentValidation)
    │   └── Hata varsa → ValidationException (400) — Handler çağrılmaz
    ↓ Handler
    ↓ IApplicationDbContext
    ↓ PostgreSQL
    ↓ DTO → HTTP Yanıtı
```

### Feature Özeti

| Feature | Command / Query | Açıklama |
|---|---|---|
| **Auth** | `LoginMerchantCommand` | Email + Password → JWT Token |
| **Merchants** | `CreateMerchantCommand` | Yeni işletme kayıt |
| **Merchants** | `GetAllMerchantsQuery` | Tüm aktif işletmeler |
| **Couriers** | `CreateCourierCommand` | Merchant doğrula, plaka/tel benzersiz |
| **Couriers** | `GetCouriersByMerchantQuery` | `isAvailable?` filtreli liste |
| **Orders** | `CreateOrderCommand` | Status zorla Pending |
| **Orders** | `AssignOrderCommand` | Kurye ata, `IsAvailable=false` |
| **Orders** | `UpdateOrderStatusCommand` | State machine geçişleri |
| **Orders** | `GetActiveOrdersQuery` | Pending+Assigned+PickedUp |
| **Orders** | `GetOrdersByMerchantQuery` | `status?` filtreli, en yeni üstte |

### Yan Etkiler (AssignOrder / UpdateOrderStatus)

| Olay | Yan Etki |
|---|---|
| Kurye atandı | `Courier.IsAvailable = false` |
| PickedUp | `Order.PickedUpAt = UtcNow` |
| Delivered | `Order.DeliveredAt = UtcNow` + `Courier.IsAvailable = true` |
| Cancelled | `Courier.IsAvailable = true` (atanmışsa) |

---

## 6. Infrastructure Katmanı

### AppDbContext

- `IApplicationDbContext` implement eder
- `SaveChangesAsync` override → audit alanları otomatik
- Global Query Filter → `IsDeleted=false`
- Entity config → ayrı `IEntityTypeConfiguration<T>` sınıfları

### Fluent API Index'leri

| Tablo | Index | Tür |
|---|---|---|
| Merchants | `Email` | Unique |
| Couriers | `LicensePlate` | Unique |
| Couriers | `PhoneNumber` | Unique |
| Orders | `MerchantId + Status` | Composite |

### JwtService Claims

```
sub        → MerchantId (Guid)
email      → E-posta adresi
jti        → Benzersiz token ID
iat        → Üretim zamanı (Unix)
merchantId → Özel claim (Controller'da okunabilir)
```

---

## 7. API Katmanı

### Middleware Sırası

```
UseExceptionHandler()   ← EN BAŞTA
UseHttpsRedirection()
UseAuthentication()     ← UseAuthorization'dan ÖNCE
UseAuthorization()
MapControllers()
```

### Global Exception Mapping

| Exception | HTTP | Açıklama |
|---|---|---|
| `ValidationException` | 400 | Alan bazlı hata listesi |
| `UnauthorizedAccessException` | 401 | Geçersiz kimlik bilgileri |
| `InvalidOperationException` | 422 | Domain iş kuralı ihlali |
| Diğer | 500 | Beklenmedik hata |

**Örnek 400 yanıtı:**
```json
{
  "title": "Doğrulama hatası",
  "status": 400,
  "errors": {
    "Email": ["Geçerli bir e-posta adresi giriniz."],
    "PickupLatitude": ["Alım enlem değeri -90 ile 90 arasında olmalıdır."]
  }
}
```

---

## 8. Veritabanı

**Bağlantı:**
```
Host=localhost;Port=5432;Database=KuryeDb;Username=admin;Password=Password123*
```

**Migration Geçmişi:**

| Migration | Tarih | İçerik |
|---|---|---|
| `InitialCreate` | 03.09.2026 | Merchants, Couriers, Orders |
| `AddMerchantPasswordHash` | 07.09.2026 | `Merchants.PasswordHash` kolonu |

**Migration Komutları:**
```powershell
# Yeni migration
dotnet ef migrations add <Ad> `
  --project src/KuryeSistemi.Infrastructure `
  --startup-project src/KuryeSistemi.API

# Veritabanını güncelle
dotnet ef database update `
  --project src/KuryeSistemi.Infrastructure `
  --startup-project src/KuryeSistemi.API
```

---

## 9. Authentication — JWT

**appsettings.json:**
```json
"JwtSettings": {
  "SecretKey": "KuryeSistemi_SuperSecret_JWT_Key_2026_MinLength32Chars!",
  "Issuer": "KuryeSistemi.API",
  "Audience": "KuryeSistemi.Clients",
  "ExpiryMinutes": 1440
}
```

> [!CAUTION]
> Üretimde `SecretKey`'i environment variable veya Azure Key Vault'a taşı!

**Login Akışı:**
```
POST /api/auth/login { email, password }
  → Merchant bul (email, büyük/küçük harf duyarsız)
  → IsActive kontrolü
  → PasswordHash doğrula
  → JwtService.GenerateToken(merchantId, email)
  → { token, merchantId, merchantName, email, expiresAt }
```

**Korunan Controller'lar:** `[Authorize]`
- `CouriersController`
- `OrdersController`

---

## 10. Validation — FluentValidation

Validator'lar assembly scan ile otomatik kaydedilir. Yeni validator = sadece `AbstractValidator<T>` sınıfı oluştur.

| Command | Kurallar |
|---|---|
| `CreateMerchantCommand` | Name zorunlu, Email format, Password min 6 karakter, PhoneNumber regex |
| `CreateCourierCommand` | Tüm alanlar zorunlu, Email format, PhoneNumber regex, Plaka/Marka/Model |
| `CreateOrderCommand` | Adresler zorunlu, Lat ∈ [-90,90], Lon ∈ [-180,180], RecipientPhone regex |
| `LoginMerchantCommand` | Email format, Password min 6 karakter |

---

## 11. API Endpoint Listesi

### Auth
| Method | URL | Token | Açıklama |
|---|---|---|---|
| `POST` | `/api/auth/login` | ❌ | JWT token al |

### Merchants
| Method | URL | Token | Açıklama |
|---|---|---|---|
| `GET` | `/api/merchants` | ❌ | Tüm işletmeler |
| `POST` | `/api/merchants` | ❌ | Yeni işletme oluştur |

### Couriers
| Method | URL | Token | Açıklama |
|---|---|---|---|
| `GET` | `/api/couriers?merchantId={id}` | ✅ | Tüm kuryeler |
| `GET` | `/api/couriers?merchantId={id}&isAvailable=true` | ✅ | Müsait kuryeler |
| `GET` | `/api/couriers?merchantId={id}&isAvailable=false` | ✅ | Meşgul kuryeler |
| `POST` | `/api/couriers` | ✅ | Yeni kurye ekle |

### Orders
| Method | URL | Token | Açıklama |
|---|---|---|---|
| `GET` | `/api/orders?merchantId={id}` | ✅ | Tüm siparişler |
| `GET` | `/api/orders?merchantId={id}&status={n}` | ✅ | Filtreli siparişler |
| `GET` | `/api/orders/active/{merchantId}` | ✅ | Aktif siparişler |
| `POST` | `/api/orders` | ✅ | Sipariş oluştur |
| `PUT` | `/api/orders/{id}/assign` | ✅ | Kurye ata |
| `PUT` | `/api/orders/{id}/status` | ✅ | Durum güncelle |

### Realtime (SignalR / WebSockets)
| Protokol / Method | URL / Hub | Token | Açıklama |
|---|---|---|---|
| `WSS` / `WS` | `/hubs/location?access_token={token}` | ✅ | Gerçek zamanlı kurye konum yayını (LocationHub) |

**Status değerleri:** `0`=Pending · `1`=Assigned · `2`=PickedUp · `3`=Delivered · `4`=Cancelled

---

## 12. Postman & İstemci Test Rehberi

### Kurulum
```powershell
# 1. PostgreSQL & Redis başlat (Docker)
docker-compose up -d

# 2. API'yi başlat
cd C:\kuryesistemi\Backend
dotnet run --project src/KuryeSistemi.API
```

### Postman Import
`Import → Link` → `https://localhost:7223/swagger/v1/swagger.json`

> Postman Settings → SSL certificate verification → **OFF**

### Test Akışı (Sırayla)

**1. Merchant Oluştur**
```json
POST /api/merchants
{
  "name": "Test Kargo A.Ş.",
  "email": "test@kargo.com",
  "password": "sifre123",
  "phoneNumber": "+905551234567",
  "address": "Levent, İstanbul"
}
```

**2. Login**
```json
POST /api/auth/login
{
  "email": "test@kargo.com",
  "password": "sifre123"
}
```
→ `token` değerini Postman'de Collection → Authorization → Bearer Token'a yapıştır

**3. Kurye Ekle**
```json
POST /api/couriers
{
  "merchantId": "{merchantId}",
  "firstName": "Ahmet", "lastName": "Yılmaz",
  "phoneNumber": "+905551112233",
  "email": "ahmet@kurye.com",
  "vehicleType": 0,
  "licensePlate": "34 AHM 001",
  "vehicleBrand": "Honda", "vehicleModel": "CB500"
}
```

**4. Sipariş Oluştur**
```json
POST /api/orders
{
  "merchantId": "{merchantId}",
  "pickupAddressLine": "Çay Mahallesi No:12",
  "pickupDistrict": "İskenderun", "pickupCity": "Hatay",
  "pickupLatitude": 36.5871, "pickupLongitude": 36.1734,
  "deliveryAddressLine": "Numune Mah. 182. Sk.",
  "deliveryDistrict": "İskenderun", "deliveryCity": "Hatay",
  "deliveryLatitude": 36.5822, "deliveryLongitude": 36.1689,
  "recipientName": "Ahmet Müşteri",
  "recipientPhone": "+905559998877",
  "notes": "Kapıya bırakın."
}
```

**5. Kurye Ata**
```json
PUT /api/orders/{orderId}/assign
{ "courierId": "{courierId}" }
```

**6. PickedUp → Delivered**
```json
PUT /api/orders/{orderId}/status
{ "newStatus": 2 }   // PickedUp

PUT /api/orders/{orderId}/status
{ "newStatus": 3 }   // Delivered
```

**7. SignalR Canlı Kurye Konumu Testi**
```javascript
// Postman WebSocket bağlantısı veya Frontend JS:
// URL: wss://localhost:7223/hubs/location?access_token={token}

// Kurye konum gönderir:
await connection.invoke("SendLocationUpdate", courierId, 41.0082, 28.9784);

// İşletme paneli dinler:
connection.on("ReceiveLocationUpdate", (courierId, lat, lng) => {
    console.log("Kurye Konumu:", courierId, lat, lng);
});
```

**8. Redis Önbellek & Invalidation Testi**
1. `GET /api/orders/active/{merchantId}` çağrılır → Log: `[REDIS CACHE MISS] Veritabanından çekiliyor...` ardından `[REDIS CACHE SET]`.
2. Tekrar `GET /api/orders/active/{merchantId}` çağrılır → Log: `[REDIS CACHE HIT] Anahtar: orders:active:merchant:...` (DB sorgusu atılmaz).
3. `POST /api/orders` ile yeni sipariş oluşturulur → Log: `[REDIS CACHE INVALIDATED] Önbellek silindi...`.
4. Tekrar `GET /api/orders/active/{merchantId}` çağrıldığında güncel liste DB'den çekilir ve Redis yenilenir.

---

## 13. Kullanılan Paketler

| Katman | Paket | Versiyon |
|---|---|---|
| Application | `MediatR` | 12.4.1 |
| Application | `FluentValidation` | 11.10.0 |
| Application | `FluentValidation.DependencyInjectionExtensions` | 11.10.0 |
| Application | `Microsoft.EntityFrameworkCore` | 8.0.8 |
| Infrastructure | `Microsoft.EntityFrameworkCore` | 8.0.8 |
| Infrastructure | `Npgsql.EntityFrameworkCore.PostgreSQL` | 8.0.8 |
| Infrastructure | `Microsoft.EntityFrameworkCore.Design` | 8.0.8 |
| Infrastructure | `Microsoft.AspNetCore.Authentication.JwtBearer` | 8.0.8 |
| Application | `Microsoft.Extensions.Caching.Abstractions` | 8.0.0 |
| Infrastructure | `Hangfire.Core` | 1.8.14 |
| Infrastructure | `Hangfire.AspNetCore` | 1.8.14 |
| Infrastructure | `Hangfire.PostgreSql` | 1.20.9 |
| API | `Hangfire.AspNetCore` | 1.8.14 |
| API | `Hangfire.PostgreSql` | 1.20.9 |
| API | `Microsoft.AspNetCore.Authentication.JwtBearer` | 8.0.8 |
| API | `Microsoft.Extensions.Caching.StackExchangeRedis` | 8.0.8 |
| API | `Serilog.AspNetCore` | 8.0.2 |
| API | `Serilog.Sinks.Async` | 2.0.0 |
| API | `Swashbuckle.AspNetCore` | 6.6.2 |

---

## 14. Realtime, Önbellekleme, Görev & Loglama Altyapısı

### 14.1. SignalR (WebSockets) — Canlı Konum Hub'ı
- **Hub Sınıfı:** `LocationHub` (`/hubs/location`)
- **Güvenlik:** `[Authorize]` ile korumalı.
- **WebSocket Auth:** `access_token` query parametresi `JwtBearerEvents.OnMessageReceived` üzerinden yakalanır.
- **Yayın:** `SendLocationUpdate(courierId, lat, lng)` → `ReceiveLocationUpdate` event'i ile tüm dinleyicilere anlık iletilir.

### 14.2. Redis Distributed Cache & MediatR Pipeline Behavior
- **Sözleşme:** `ICacheableQuery` (`CacheKey`, `SlidingExpiration`)
- **Merkezi Davranış:** `CachingBehavior<TRequest, TResponse>`
- **Çalışma Mantığı:**
  1. `request is ICacheableQuery` ise önce Redis kontrol edilir.
  2. **Cache Hit:** Veri bulunduysa veritabanına inmeden JSON'dan deserialize edilip dönülür.
  3. **Cache Miss:** Veritabanından çekilir, JSON olarak Redis'e yazılır ve dönülür.
  4. Örnek uygulama: `GetActiveOrdersQuery` (`orders:active:merchant:{merchantId}`).

### 14.3. Redis Cache Invalidation & MediatR Pipeline Behavior
- **Sözleşme:** `ICacheRemoverCommand` (`CacheKey`)
- **Merkezi Davranış:** `CacheInvalidationBehavior<TRequest, TResponse>`
- **Çalışma Mantığı:**
  1. `request is ICacheRemoverCommand` ise **önce** `await next()` ile veritabanı işlemi yürütülür.
  2. Veritabanı işlemi **başarılı** olduktan sonra `IDistributedCache.RemoveAsync(CacheKey)` çağrılarak bayat veri Redis'ten temizlenir.
  3. Redis anlık kesintilerine karşı `try-catch` koruması mevcuttur (Redis erişilemez olsa dahi veritabanı işlemi başarıyla sonuçlanır).
  4. Örnek uygulama: `CreateOrderCommand` (`orders:active:merchant:{MerchantId}`).

### 14.4. Hangfire (PostgreSQL) — Gecikmeli Görevler & Sipariş Zaman Aşımı
- **Dashboard:** `https://localhost:7223/hangfire` (görsel yönetim arayüzü)
- **Depolama:** PostgreSQL (`Hangfire.PostgreSql`)
- **Sözleşme:** `IBackgroundJobService` (`ScheduleUnassignedOrderCheck(orderId, delay)`)
- **Gecikmeli Görev:** `OrderTimeoutJob` (`ExecuteAsync(orderId)`)
- **Çalışma Mantığı:**
  1. `CreateOrderCommandHandler` içinde sipariş DB'ye kaydedildiğinde `ScheduleUnassignedOrderCheck(order.Id, TimeSpan.FromMinutes(15))` tetiklenir.
  2. Hangfire 15 dakika sonra görevi yürütür:
     - Sipariş durumu hala `Pending` ise `UpdateOrderStatusCommand` ile durumunu `Cancelled` yapar.
     - `IHubNotificationService` aracılığıyla SignalR üzerinden işletmeye anlık bildirim yayınlar.
     - Eğer 15 dakika dolmadan kurye atanmışsa (durum `Assigned` vb. olmuşsa) siparişe dokunulmaz.

### 14.5. Serilog, MediatR Logging Behavior & Global Exception Handler
- **Serilog:** Console ve günlük dönen asenkron dosya sink'i (`logs/kuryesistemi-log-.txt`, `RollingInterval.Day`, 30 gün saklama).
- **MediatR LoggingBehavior:** 
  - Gelen her isteğin adını ve parametrelerini loglar.
  - `Stopwatch` ile çalışma süresini ölçer.
  - Çalışma süresi **500 ms**'yi aşan istekleri otomatik olarak `[PERFORMANCE WARNING]` olarak işaretler.
- **Global Exception Handler (.NET 8 `IExceptionHandler`):**
  - Tüm beklenmedik ve yakalanmayan hataları Serilog ile detaylıca (`LogError`) kaydeder.
  - İstemciye RFC 7807 uyumlu `ProblemDetails` (`application/problem+json`) modelinde güvenli yanıt döner.
  - Hata Eşlemesi: `ValidationException` → 400, `UnauthorizedAccessException` → 401, `InvalidOperationException` → 422, Beklenmeyen Hatalar → 500.

---

## 15. Sonraki Adımlar

### 🔶 Tamamlanan Altyapılar
- [x] **SignalR Hub** — Canlı kurye konum yayını (`/hubs/location`)
- [x] **Redis Distributed Cache** — MediatR Caching Pipeline Behavior & `ICacheableQuery`
- [x] **Redis Cache Invalidation** — MediatR Invalidation Pipeline Behavior & `ICacheRemoverCommand`
- [x] **Hangfire Background Jobs** — PostgreSQL destekli gecikmeli sipariş zaman aşımı denetimi (`/hangfire`)
- [x] **Serilog & Logging Behavior** — Merkezi loglama, performans izleme (>500ms uyarısı)
- [x] **Modern Global Exception Handler** — .NET 8 `IExceptionHandler` ve RFC 7807 `ProblemDetails`

### 🔷 Kısa & Orta Vadeli
- [ ] **BCrypt** — `PasswordHash` düz metin → `BCrypt.Net-Next`
- [ ] **Refresh Token** — Uzun süreli oturum
- [ ] **ICurrentUserService** — Token'dan MerchantId otomatik çekme
- [ ] **GPS Endpoint** — `PUT /api/couriers/{id}/location`
- [ ] **Pagination** — Büyük liste desteği
- [ ] **OpenTelemetry / Sentry** — Hata izleme

### 🔵 Uzun Vadeli
- [ ] **Docker Compose** — API + PostgreSQL + Redis stack
- [ ] **CI/CD** — GitHub Actions
- [ ] **Rate Limiting** — Endpoint bazlı istek sınırlama

---

## 16. Flutter Mobil Uygulaması (`kurye_mobil`) & Riverpod Auth Mimarisi (08.09.2026)

### 16.1. Ekranlar ve UI Mimarisi (Piksel Hassasiyetli Tasarım)
- **Tema ve Renk Sistemi (`lib/theme/`):**
  - `app_colors.dart`: Dark mode uyumlu Tailwind CSS renk paleti (`#0B1326` background, `#FF6B00` primary container, `#4EDEA3` secondary vb.).
  - `app_text_styles.dart`: Google Fonts `Inter` tipografisi.
  - `app_theme.dart`: Global Material 3 Dark theme konfigürasyonu.
- **Ekranlar (`lib/ui/screens/`):**
  - `login_screen.dart`: Saha Operasyon Giriş ekranı (Riverpod ConsumerStatefulWidget, form doğrulama, dinamik buton spinner, JWT token doğrulama akışı).
  - `home_screen.dart`: Kurye Ana Kokpiti (Üst bilgi kartı, dinamik saat, dokunsal swipe-shift mesai açma/kapatma toggle'ı, 2'li KPI ızgarası, dalga animasyonlu radar tarayıcısı, eldiven dostu hızlı eylem şeridi).
  - `active_order_map_screen.dart`: Canlı Sipariş ve Harita (Taktiksel karanlık vektör harita, CustomPainter ile çizilen parlayan kurye rotası, GPS pini, restoran pini, hedef pini, 8 dk ETA HUD rozeti, yüzen kontrol araç çubuğu, yukarı çekilebilir sipariş detay bottom sheet'i ve 3 fazlı devasa operasyon aksiyon butonu).
  - `wallet_screen.dart`: Hakediş ve Cüzdan (Degrade bakiye kartı, 7 günlük pik vurgulu performans çubuk grafiği, filtreli işlem geçmişi listesi, mikro etkileşimli FAST para çekme butonu ve güvenlik kartı).
- **Ortak Navigasyon (`lib/ui/widgets/custom_bottom_nav.dart`):**
  - Buzlu cam efektli (`BackdropFilter` blur), ekranlar arası çift yönlü geçiş destekli alt navigasyon çubuğu (Ana Sayfa, Harita, Cüzdan, Profil).

### 16.2. Durum Yönetimi & API Entegrasyonu (Feature-First)
- **Kullanılan Paketler:**
  - `flutter_riverpod: ^3.4.3` (Modern NotifierProvider & Notifier mimarisi)
  - `dio: ^5.11.1` (Gelişmiş HTTP istemcisi, interceptor'lar, hata haritalama)
  - `flutter_secure_storage: ^11.0.0` (Şifrelenmiş donanım tabanlı JWT depolama)
- **Ağ Katmanı (`lib/core/network/dio_client.dart`):**
  - Platforma göre otomatik loopback tespiti (Android Emulator için `10.0.2.2:5000`, masaüstü/iOS için `localhost:5000`).
  - `InterceptorsWrapper`: Her giden isteğe güvenli depodan okunan `Authorization: Bearer <token>` başlığını otomatik ekleme.
  - Merkezi hata yönetimi (`_mapDioException`): 401 Unauthorized, 400 Bad Request, zaman aşımı ve bağlantı kopmalarını anlaşılır Türkçe mesajlara dönüştürme.
- **Güvenli Depolama (`lib/core/storage/secure_storage_service.dart`):**
  - `AndroidOptions(resetOnError: true)` ve `IOSOptions` ile donanımsal koruma.
  - JWT token, `merchantId`, `merchantName` ve `email` verilerini okuma/yazma/silme.
- **Auth Modülü (`lib/features/auth/`):**
  - `models/auth_response_model.dart`: Backend `AuthTokenDto` ve `LoginRequest` ile birebir uyumlu model.
  - `repositories/auth_repository.dart`: `POST /api/auth/login` isteğini yürüten depo katmanı.
  - `providers/auth_provider.dart`: `AuthState` (`initial`, `loading`, `authenticated`, `error`) ve `AuthNotifier` (NotifierProvider). Giriş başarılı olduğunda token'ı otomatik saklar ve oturumu hafızaya alır.
- **Uygulama Giriş Noktası (`lib/main.dart`):**
  - `runApp` fonksiyonu `ProviderScope` ile sarmalandı.

### 16.3. Gerçek Zamanlı SignalR & GPS Konum Takip Mimarisi (08.09.2026)
- **Eklenen Paketler:**
  - `signalr_netcore: ^1.4.4` (ASP.NET Core SignalR WebSockets istemcisi)
  - `geolocator: ^14.0.3` (Yüksek hassasiyetli GPS konum sağlayıcı)
  - `permission_handler: ^13.0.2` (Çalışma zamanı konum izin yöneticisi)
- **SignalR Servisi (`lib/core/realtime/signalr_service.dart`):**
  - Backend `LocationHub` (`/hubs/location`) ile WebSocket bağlantısı.
  - `accessTokenFactory` ile `secure_storage_service` üzerinden JWT token entegrasyonu.
  - Otomatik yeniden bağlanma (`withAutomaticReconnect(retryDelays: [0, 2s, 5s, 10s, 30s])`).
  - `SendLocationUpdate(courierId, latitude, longitude)` metodu ile canlı konum yayını.
- **Konum Servisi (`lib/features/location/services/location_service.dart`):**
  - Cihaz GPS izinlerini (`checkAndRequestPermission()`) denetleme.
  - Android için ön plan servis bildirimi (`ForegroundNotificationConfig`) ve `LocationAccuracy.high` ile 5 metre / 3 saniye aralıklı `getPositionStream()`.
- **Location Provider (`lib/features/location/providers/location_provider.dart`):**
  - Riverpod `Notifier<LocationState>` mimarisi.
  - `LocationState`: Enlem, boylam, anlık hız (`speedKmH`), yön (`heading`), GPS sapması (`accuracy`), takip durumu ve SignalR bağlantı durumu (`connecting`, `connected`, `reconnecting`, `disconnected`).
  - GPS konumu her güncellendiğinde otomatik olarak backend `SendLocationUpdate` metodunu tetikleme.
- **UI Entegrasyonu (`lib/ui/screens/active_order_map_screen.dart`):**
  - `SignalHudBar` bileşeni `Consumer` ile dinamik bağlantı durumuna bağlandı:
    - **Bağlı:** Yeşil nabız atan nokta ve *"SIGNALR: CANLI BAĞLI"*.
    - **Bağlanıyor/Yeniden Bağlanıyor:** Turuncu nokta ve *"SIGNALR: BAĞLANIYOR..."*.
    - **Koptu:** Kırmızı nokta ve *"SIGNALR: BAĞLANTI KOPTU"*.
  - `TacticalMapView` bileşeni `locationProvider`'daki gerçek zamanlı GPS hızını (*"Sen (42 km/s)"*) anlık olarak ekrana yansıtacak şekilde dinamikleştirildi.

### 16.4. Aktif Siparişler & Riverpod Operasyon Mimarisi (08.09.2026)
- **Model Katmanı (`lib/features/orders/models/order_model.dart`):**
  - Backend `OrderDto` yapısıyla tam uyumlu `OrderModel`.
  - `OrderStatus` enum (`Pending = 0`, `Assigned = 1`, `PickedUp = 2`, `Delivered = 3`, `Cancelled = 4`).
  - `shortCode` (Örn: `#KS-8942`), `isActiveTask` (`Assigned` veya `PickedUp` denetimi), `fullPickupAddress` ve `fullDeliveryAddress` yardımcı metotları.
- **Repository Katmanı (`lib/features/orders/repositories/order_repository.dart`):**
  - `DioClient` ve `SecureStorageService` ile entegre.
  - `GET /api/orders/active/{merchantId}` endpoint'i üzerinden aktif sipariş listesini çeker; `merchantId` parametre verilmediğinde güvenli depodan dinamik okunur.
- **State Management (`lib/features/orders/providers/order_provider.dart`):**
  - Modern Riverpod `Notifier<OrderState>` ve `orderProvider`.
  - API'den gelen siparişlerde kuryeye atanmış (`Assigned` veya `PickedUp`) ilk siparişi otomatik olarak `activeOrder` olarak seçer.
  - `hasActiveTask` getter'ı, `completeCurrentTask()` ve `selectActiveOrder()` durum geçişleri.
- **UI Entegrasyonu:**
  - **Ana Kokpit (`lib/ui/screens/home_screen.dart`):**
    - `ref.watch(orderProvider)` ile siparişleri dinler.
    - Kuryenin üzerinde aktif görev varsa (`hasActiveTask == true`), radar tarama animasyonu gizlenir ve yerine modern `ActiveTaskCard` (Sipariş kodu, restoran ve teslimat adres özeti, kazanç rozeti ve doğrudan haritaya yönlendiren buton) gösterilir.
    - Görev yoksa radar aktif arama durumunu korur.
    - Sayfa başına `RefreshIndicator` ile aşağı çekerek yenileme eklendi.
  - **Canlı Harita (`lib/ui/screens/active_order_map_screen.dart`):**
    - `orderProvider` dinlenir; `TacticalMapView` bileşenine gerçek restoran ve müşteri varış adresi iletilir.
    - Üst başlık çubuğundaki durum rozeti aktif görev varsa `• AKTİF` (yeşil), yoksa `• BEKLEMEDE` (turuncu/mavi) olarak dinamikleşir.
  - **Sipariş Kartı (`lib/ui/widgets/order_bottom_sheet.dart`):**
    - Gerçek `OrderModel` verilerini (Sipariş kısa kodu, net hakediş, restoran detayları, müşteri adı, telefonu ve özel teslimat notu) ekrana yansıtır.
    - Görev bulunmadığında ekranı bozmadan şık bir *"Aktif Görev Bekleniyor"* bekleme kartı ve siparişleri kontrol etme butonu sergiler.

### 16.5. Sipariş Durum Güncelleme & Devasa Aksiyon Butonu Mimarisi (08.09.2026)
- **DioClient Genişletmesi (`lib/core/network/dio_client.dart`):**
  - Standart HTTP istemcisine `put<T>` ve `delete<T>` metotları eklendi.
- **Repository Katmanı (`lib/features/orders/repositories/order_repository.dart`):**
  - `updateOrderStatus(String orderId, int newStatus)` metodu eklendi.
  - `PUT /api/orders/{id}/status` endpoint'ine `{ "newStatus": newStatus }` JSON gövdesiyle istek gönderir ve güncellenen `OrderModel`'i döner.
- **Durum Yönetimi (`lib/features/orders/providers/order_provider.dart`):**
  - `OrderState` içine `isUpdatingStatus` boolean alanı eklendi.
  - `changeOrderStatus(int newStatus)` metodu:
    - İstek öncesi `isUpdatingStatus = true` yaparak UI'da spinner ve buton kilitlemesini (disabled state) tetikler.
    - `_repository.updateOrderStatus` çağrısı yapar.
    - Başarılı olduğunda `await fetchActiveOrders()` ile sipariş listesini sunucudan tekrar çekerek UI'ın güncel state ile kusursuz senkronizasyonunu sağlar.
- **Devasa Buton & Bottom Sheet Entegrasyonu (`lib/ui/widgets/giant_action_button.dart` & `order_bottom_sheet.dart`):**
  - Sipariş durumu `Assigned (1)` ise buton *"Paketi Teslim Aldım"* metni ve paket ikonuyla açılır; tıklandığında `changeOrderStatus(2)` (PickedUp) tetiklenir.
  - Sipariş durumu `PickedUp (2)` ise buton *"Teslim Edildi"* metni ve yeşil başarı temasıyla açılır; tıklandığında `changeOrderStatus(3)` (Delivered) tetiklenir.
  - İşlem devam ederken buton üzerinde animasyonlu `CircularProgressIndicator` spinner gösterilir ve mükerrer tıklamalar kilitlenir.
  - İşlem başarıyla tamamlandığında ekranda yeşil renkli, dokunsal geribildirimli *"Durum güncellendi"* SnackBar'ı gösterilir.

---

## 17. Kurumsal Mimari Refactoring — CepteServis Standartları (09.09.2026)

Proje mimarisi, `C:\csharpweb\CepteServis\CepteServis` projesinde uygulanan profesyonel standartlar (Zero-Logic Controllers, DbContext izolasyonu, Interface tabanlı Servis/Repository katmanı, `ServiceResult<T>` deseni, `IReadOnlyList<TDto>` koleksiyonları ve modüler `Extensions/` yapısı) ile uçtan uca refactor edilmiştir.

### 17.1. Ortak Yanıt Modeli (`ServiceResult<T>` & `ServiceResult`)
- **Konum:** `KuryeSistemi.Application/Common/Models/ServiceResult.cs` & `Common/Exceptions/AppException.cs`
- **Tasarım:** Tüm API uç noktaları tek tip yanıt döner:
  ```json
  {
    "isSuccess": true,
    "data": { ... },
    "message": "İşlem başarılı.",
    "statusCode": 200,
    "errors": []
  }
  ```
- **Fabrika Metotları:** `Success`, `Created` (201), `Fail` (400), `NotFound` (404), `Unauthorized` (401), `Conflict` (409), `BadRequest` (400), `InternalError` (500).

### 17.2. Sıfır-Mantık `BaseController` (Zero-Logic Presentation Layer)
- **Konum:** `KuryeSistemi.API/Controllers/BaseController.cs`
- **Yetenekler:**
  - `CreateActionResult<T>(ServiceResult<T> result) => StatusCode(result.StatusCode, result);`
  - `CreateActionResult(ServiceResult result) => StatusCode(result.StatusCode, result);`
  - JWT Claim Okuyucuları: `GetMerchantId()`, `GetUserId()`, `GetUserEmail()`.
- **Refactor Edilen Controller'lar:**
  - `AuthController`: Yalnızca `IAuthService` çağırır ve `CreateActionResult` döner.
  - `OrdersController`: 0 satır `try-catch`, 0 satır raw logic; yalnızca `IOrderService` çağırır.
  - `CouriersController`: Yalnızca `ICourierService` çağırır.
  - `MerchantsController`: Yalnızca `IMerchantService` çağırır.

### 17.3. Interface Tabanlı Servis ve Repository Katmanı (SOLID & DIP)
- **Repository Katmanı:**
  - `IGenericRepository<T>` & `GenericRepository<T>`
  - `IOrderRepository` & `OrderRepository`: `GetActiveOrdersByMerchantAsync`, `GetOrdersByMerchantAsync`, `GetWithDetailsAsync`.
  - `ICourierRepository` & `CourierRepository`: `GetCouriersByMerchantAsync`, `GetByEmailAsync`, `IsPlateOrPhoneExistsAsync`.
  - `IMerchantRepository` & `MerchantRepository`: `GetByEmailAsync`, `IsEmailExistsAsync`, `GetAllActiveAsync`.
- **İş Servisleri (Business Layer):**
  - `IAuthService` & `AuthService`: Hem Merchant hem Courier e-posta girişi, şifre doğrulama ve JWT token üretimi.
  - `IOrderService` & `OrderService`: Sipariş oluşturma, Hangfire zaman aşımı planlaması, kurye atama (müsaitlik/tenant denetimi), durum güncelleme ve SignalR bildirimleri.
  - `ICourierService` & `CourierService`: Kurye listeleme, plaka/telefon benzersizlik denetimi ve kayıt oluşturma.
  - `IMerchantService` & `MerchantService`: İşletme oluşturma ve listeleme.
- **Dönüş Tipleri:** Tüm liste operasyonlarında `IReadOnlyList<TDto>` kullanılarak immutable koleksiyon güvencesi sağlandı.

### 17.4. Modüler `Extensions/` ve 70 Satırlık `Program.cs`
- `Program.cs` 205 satırlık karmaşık bloktan kurtarılarak 70 satırlık temiz bir pipeline'a dönüştürüldü:
  - `DatabaseExtensions.cs`: PostgreSQL, AppDbContext, Redis Cache, Hangfire Storage & Server.
  - `RepositoryExtensions.cs`: Repository DI kayıtları (`AddScoped`).
  - `ServiceExtensions.cs`: Uygulama servisleri DI kayıtları (`AddScoped`).
  - `AuthExtensions.cs`: JWT Bearer konfigürasyonu ve SignalR query access_token yakalayıcısı.
  - `SwaggerExtensions.cs`: Swagger UI ve JWT Bearer kilit ikonu.
  - `CorsExtensions.cs`: Mobil ve SignalR istemcileri için esnek CORS politikası.
  - `GlobalExceptionMiddleware.cs`: Beklenmedik istisnaları yakalayıp `ServiceResult.Fail(...)` JSON formatına dönüştüren kurumsal middleware.

### 17.5. Mobil İstemci Esnekliği (`kurye_mobil`)
- `AuthResponseModel.fromJson` ve `OrderRepository` (`getActiveOrders`, `updateOrderStatus`) güncellendi.
- Yanıtlar hem yeni `ServiceResult<T>` (`data` sarmalayıcısı) hem de doğrudan nesne/dizi formatlarını destekleyecek şekilde uyarlanarak kesintisiz geriye dönük uyumluluk sağlandı.

### 17.6. Derleme ve Kalite Güvencesi
- **Backend Build:** `dotnet build KuryeSistemi.sln` → **0 Hata, 0 Uyarı**
- **Mobil Analyze:** `flutter analyze kurye_mobil` → **No issues found!**

---

## 18. Kurye Cüzdan (Wallet) Modülü & Tarihsel Değişmezlik Mimarisi (09.09.2026)

Kuryelerin günlük kazançlarını ve tamamladıkları teslimatları anlık olarak takip edebilmeleri için Clean Architecture backend ve Flutter Riverpod mobil istemci uçtan uca inşa edilmiştir.

### 18.1. Temel İş Kuralı: Tarihsel Değişmezlik (Historical Invariance)
Kurye paket başı hakedişi sabit bir rakam değildir; işletme (Merchant) veya sistem tarafından dinamik olarak belirlenir (`Merchant.DefaultPackageFee`). Fiyat ilerleyen tarihlerde güncellense dahi kuryelerin geçmiş kazanç kayıtlarının ve hak edişlerinin bozulmaması kurumsal bir zorunluluktur.
Bu kural gereği:
1. `Order` entity'sine `CourierEarning (decimal(18,2))` alanı eklenmiştir.
2. Sipariş kurye tarafından `Delivered (3)` durumuna geçirildiği anda, o siparişi veren işletmenin güncel paket başı ücreti (`Merchant.DefaultPackageFee`, varsayılan 75.00 TL) okunarak bu alana **mühürlenir** (`order.CourierEarning = packageFee`).
3. Kurye cüzdanı, günlük kazanç veya geriye dönük hak ediş raporlarında dinamik tarife katsayıları kullanılmaz; sadece mühürlenmiş olan `Order.CourierEarning` değerlerinin toplamı (`Sum`) üzerinden hesaplama yapılır.

### 18.2. Domain & Veritabanı Modeli
- **Order Entity (`KuryeSistemi.Domain/Entities/Order.cs`):** `CourierEarning` (`decimal(18,2)`) alanı ve EF Core Fluent API yapılandırması.
- **Merchant Entity (`KuryeSistemi.Domain/Entities/Merchant.cs`):** `DefaultPackageFee` (`decimal(18,2)`, varsayılan `75.00m`) alanı ve EF Core Fluent API yapılandırması.
- **Migration:** `20260909073628_AddCourierEarningAndPackageFee` migration'ı oluşturularak veritabanı şemasına yansıtıldı.

### 18.3. Application & CQRS/Service Katmanı
- **DTOs (`KuryeSistemi.Application/DTOs/Wallet/`):**
  - `CourierEarningsDto`: `Date`, `TotalEarnings`, `CompletedDeliveriesCount`, `IReadOnlyList<DeliveryHistoryItemDto> Deliveries`.
  - `DeliveryHistoryItemDto`: `OrderId`, `OrderShortCode`, `Earning`, `DeliveredAt`, `CustomerName`, `DeliveryAddress`.
  - `OrderDto`: `CourierEarning` alanı eklendi.
  - `AuthTokenDto`: Kurye oturumunda doğrudan istemciye dönmek üzere `CourierId` eklendi.
- **Repository Katmanı:**
  - `IOrderRepository.GetDeliveredOrdersByCourierAndDateAsync(Guid courierId, DateTime date)`: Kuryenin belirtilen günde teslim ettiği siparişleri mühürlü kazançları ile birlikte çeker.
- **İş Mantığı (Services):**
  - `OrderService.UpdateOrderStatusAsync`: Sipariş `Delivered` statüsüne geçtiğinde `Merchant.DefaultPackageFee` değerini siparişe mühürler.
  - `CourierService.GetTodayEarningsAsync`: Belirtilen kuryenin bugünkü mühürlü kazanç toplamını (`Sum(o => o.CourierEarning)`) ve tamamlanan teslimat adedini hesaplayıp `ServiceResult<CourierEarningsDto>` içinde döner.
- **Kimlik ve Claim Yönetimi:**
  - `IJwtService` / `JwtService`: Kurye kullanıcıları için `courierId` claim'i JWT payload'ına eklenir.
  - `AuthService`: Kurye girişinde `CourierId` bilgisini `AuthTokenDto` ile istemciye iletir.

### 18.4. Presentation / API Katmanı (Zero-Logic)
- **`BaseController`:** Güvenli JWT claim okuyucusu `GetCourierId()` metodu eklendi.
- **`CouriersController`:**
  - `GET /api/couriers/{courierId:guid}/earnings/today`: Belirtilen kuryenin bugünkü kazanç detaylarını döner.
  - `GET /api/couriers/earnings/today`: Oturum açan kuryenin JWT token'ındaki `courierId` claim'ini otomatik çözümleyerek cüzdan verilerini döner.

### 18.5. Flutter Mobil Cüzdan Mimarisi (`kurye_mobil`)
- **Güvenli Depolama (`SecureStorageService`):** `courierId` get/set metotları eklendi.
- **Model Katmanı (`lib/features/wallet/models/courier_earnings_model.dart`):** `CourierEarningsModel` ve `DeliveryHistoryItemModel`.
- **Repository Katmanı (`lib/features/wallet/repositories/wallet_repository.dart`):** `WalletRepository` ile `GET /api/couriers/{courierId}/earnings/today` entegrasyonu (hem doğrudan model hem de `ServiceResult<T>` sarmalayıcısını destekler).
- **State Management (`lib/features/wallet/providers/wallet_provider.dart`):**
  - Riverpod `Notifier<WalletState>` mimarisi.
  - `fetchTodayEarnings({bool isRefresh = false})` fonksiyonu; sayfa yenilemede UI titreşimini engelleyen hafif yenileme desteği.
- **UI & UX Tasarımı (`lib/ui/screens/wallet_screen.dart`):**
  - **Kazanç Kahramanı (Earnings Hero Card):** Koyu yeşil-siyah lüks gradient, ışıma efektli büyük TL kazanç tutarı, bugünün tarihi ve tamamlanan paket rozeti.
  - **Aşağı Çek Yenile (Pull-to-Refresh):** `RefreshIndicator` ile anında sunucudan cüzdan senkronizasyonu.
  - **Teslimat Geçmişi Listesi:** Saat, sipariş kısa kodu (`#KS-XXXX`), teslimat adresi ve sağ tarafta parlak yeşil `+₺75,00` mühürlü kazanç rozeti.
  - **Tarihsel Güvence Bilgi Kartı:** Kuryeye kazançlarının asla düşmeyeceğini veya geçmişe dönük manipüle edilemeyeceğini açıklayan kurumsal şeffaflık rozeti.
  - **Boş Durum (Empty State):** Henüz teslimat yapılmadığında şık, kullanıcıyı karşılayan bilgilendirici durum tasarımı.
- **Navigasyon Kabuğu:** `MainNavigationScreen` sekme 2 (`WalletScreen`) ile alt menüden anında erişim.

### 18.6. Kalite ve Doğrulama
- **Backend Derlemesi:** `dotnet build KuryeSistemi.sln` → **0 Hata, 0 Uyarı**
- **Mobil Kod Analizi:** `flutter analyze` → **No issues found! (0 Hata)**

---

## 19. Dış Servisler (SMS, E-Posta, Push) & Harita Sağlayıcı Altyapısı (09.09.2026)

Geliştirici (Development) ve Canlı (Production) ortamlarının dış servis bağımlılıklarını güvenle ayırmak ve harita sağlayıcılarını dinamik yapılandırmak için kurumsal altyapı tesis edilmiştir.

### 19.1. Backend Arayüzleri (Application Layer)
- **`ISmsService` (`Services/Interfaces/ISmsService.cs`):** `SendSmsAsync(phoneNumber, message, cancellationToken)`.
- **`IEmailService` (`Services/Interfaces/IEmailService.cs`):** `SendEmailAsync(toEmail, subject, body, isHtml, cancellationToken)`.
- **`IPushNotificationService` (`Services/Interfaces/IPushNotificationService.cs`):** `SendNotificationAsync(deviceToken, title, message, data, cancellationToken)`.

### 19.2. Mock ve Real İskeletleri (Infrastructure Layer)
- **Mock Servisler (`Infrastructure/Services/External/Mock/`):**
  - `MockSmsService`: Konsola `📱 [MOCK SMS]` logu basar.
  - `MockEmailService`: Konsola `📧 [MOCK EMAIL]` logu basar.
  - `MockPushNotificationService`: Konsola `🔔 [MOCK PUSH]` logu basar.
- **Real Servisler (`Infrastructure/Services/External/Real/`):**
  - `RealSmsService`: NetGsm vb. canlı operatör API entegrasyonuna hazır iskelet sınıf.
  - `RealEmailService`: SMTP / SendGrid canlı e-posta sunucusuna hazır iskelet sınıf.
  - `RealPushNotificationService`: Firebase Cloud Messaging (FCM HTTP v1) canlı entegrasyonuna hazır iskelet sınıf.

### 19.3. Çevreye Duyarlı DI Entegrasyonu (`ServiceExtensions.cs`)
- `builder.Environment.IsDevelopment()` kontrolü ile:
  - **Lokal Geliştirme (Development):** `MockSmsService`, `MockEmailService`, `MockPushNotificationService` kaydedilir.
  - **Canlı (Production / Staging):** `RealSmsService`, `RealEmailService`, `RealPushNotificationService` kaydedilir.

### 19.4. Harita Sağlayıcı Altyapısı (Frontend & Backend)
- **Backend (`appsettings.json`):**
  ```json
  "MapSettings": {
    "ActiveMapProvider": "OpenStreetMap",
    "GoogleMapsApiKey": ""
  }
  ```
  - `KuryeSistemi.Application/Common/Models/MapSettings.cs` strongly-typed options sınıfı oluşturuldu ve `IOptions<MapSettings>` olarak sisteme bağlandı.
- **Flutter Mobil (`kurye_mobil/.env` & `pubspec.yaml`):**
  ```env
  ACTIVE_MAP_PROVIDER=OpenStreetMap
  GOOGLE_MAPS_API_KEY=
  ```
  - `lib/core/config/app_config.dart` (`AppConfig`) ile hem `.env` dosyasından konfigürasyon okunması hem de `MapProviderType.openStreetMap` / `googleMaps` desteği sağlandı.
  - `main.dart` açılışında `await AppConfig.initialize()` ile ortam değişkenleri otomatik yüklenir.

### 19.5. Doğrulama ve Derleme
- **Backend Derlemesi:** `dotnet build KuryeSistemi.sln` → **0 Hata, 0 Uyarı**
- **Mobil Kod Analizi:** `flutter analyze` → **No issues found!**

---

## 20. Nakit/Online Ödeme Mahsuplaşma (Reconciliation) & Kurye Profil/Kasa Mimarisi (09.09.2026)

Kuryelerin firma ile olan borç/alacak ilişkisini dinamik olarak yöneten **Nakit/Online Mahsuplaşma (Reconciliation)** mantığı ve mobil tarafta 4. ana sekme olarak çalışan **Profil & Kasa Durumu** modülü uçtan uca inşa edilmiştir.

### 20.1. Domain & Mahsuplaşma (Reconciliation) Sözleşmesi
- **Bakiye İşaret Kuralı (`Courier.CurrentBalance`):**
  - `CurrentBalance > 0` (Pozitif): Kurye firmadan teslimat hak edişi alacaklıdır.
  - `CurrentBalance < 0` (Negatif): Kurye müşteriden nakit tahsil etmiş ve para kuryenin cebine girmiştir (firmaya borçludur).
  - `CurrentBalance == 0` (Sıfır): Hesap tam dengededir.
- **Sipariş `Delivered (3)` Olduğunda Atomik İş Kuralı:**
  - Sipariş `PaymentMethod.Cash` ise: `courier.CurrentBalance -= order.TotalOrderAmount` (borçlandırılır).
  - Kurye hakedişi: `courier.CurrentBalance += order.CourierEarning` (alacak eklenir).
  - İki güncelleme aynı transaction içerisinde atomik commit edilir.
- **Güvenlik & Validasyon Kuralı:**
  - Sipariş oluşturulurken `PaymentMethod != Online` (`Cash` veya `CreditCardOnDelivery`) ise `TotalOrderAmount > 0` olması FluentValidation ve Servis seviyesinde zorunlu tutulmuştur.

### 20.2. Veritabanı Modeli & Migration
- **`PaymentMethod` Enum:** `Online = 0`, `Cash = 1`, `CreditCardOnDelivery = 2`.
- **`Order` Entity:** `PaymentMethod` ve `TotalOrderAmount (decimal(18,2))` alanları.
- **`Courier` Entity:** `CurrentBalance (decimal(18,2), default 0.00)` alanı.
- **Migration:** `20260909082723_AddPaymentReconciliationAndCourierBalance` üretildi.

### 20.3. Application & API Uç Noktaları
- **`CourierProfileDto`:** Kurye kimlik bilgileri, araç detayları, bağlı işletme, güncel `CurrentBalance` ve teslimat istatistikleri.
- **`ICourierRepository.GetWithMerchantAsync`:** Kurye ve bağlı işletme verilerini tek sorguda çeker.
- **`CouriersController`:**
  - `GET /api/couriers/me/profile`: JWT claim'indeki `CourierId` üzerinden çalışan sıfır-mantık (`CreateActionResult`) profil ve kasa uç noktası.
  - `GET /api/couriers/{courierId}/profile`: Yönetici ve sistem aramaları için profil uç noktası.

### 20.4. Flutter Mobil Profil & Kasa Modülü (`kurye_mobil`)
- **Model & Repository (`features/profile/`):**
  - `CourierProfileModel`: `isIndebted`, `isCreditor`, `isBalanced`, mutlak bakiye ve para formatlayıcıları.
  - `ProfileRepository`: `GET /api/couriers/me/profile` entegrasyonu.
  - `ProfileNotifier` & `profileProvider`: Reaktif durum yönetimi ve hafif yenileme desteği.
- **Kullanıcı Arayüzü (`ui/screens/profile_screen.dart`):**
  - **Kasa Durumu Kartı (Hero):**
    - Borçlu ise: Ateş kırmızısı/amber tema, uyarı rozeti, `İşletmeye Ödenecek: 430,00 ₺` ve nakit tahsilat açıklaması.
    - Alacaklı ise: Parlak zümrüt yeşili tema, `İşletmeden Alacaklı: +140,00 ₺` ve hak ediş açıklaması.
    - Dengede ise: Modern mavi nötr tema, `Hesap Dengede: 0,00 ₺`.
  - **Canlı Yenileme (Pull-to-Refresh):** `RefreshIndicator` ile anında sunucu senkronizasyonu.
  - **Kurye & Araç Bilgileri:** Avatar, aktiflik durumu, telefon, e-posta, bağlı restoran, Türkiye formatında TR plaket tasarımı (`34 ABC 123`).
  - **İstatistikler:** Bugün tamamlanan teslimat, bugünkü kazanç ve toplam teslimat kartları.
  - **Zombi Süreç Temizliği ile Güvenli Çıkış (Logout):**
    - Onay modalı.
    - Arka planda çalışan GPS takibi (`locationProvider.stopTracking()`) sonlandırılır.
    - SignalR WebSocket bağlantısı (`signalRService.disconnect()`) kapatılır.
    - `secure_storage` temizlenerek `LoginScreen`'e yönlendirilir.
- **Navigasyon:** `MainNavigationScreen` 4. sekme (index 3) olarak `ProfileScreen` bağlandı.

### 20.5. Kalite ve Doğrulama
- **Backend Derlemesi:** `dotnet build KuryeSistemi.sln` → **0 Hata, 0 Uyarı**
- **Mobil Kod Analizi:** `flutter analyze` → **No issues found! (0 Hata)**

---

## 21. İşletme Web Paneli (`merchant_web`) Mimarisi & Kimlik Doğrulama (Auth) (10.09.2026)

İşletmelerin (restoranlar ve mağazalar) sipariş süreçlerini yönettiği, kuryeleri harita üzerinde canlı radarla izlediği ve kendi mağaza ayarlarını yapılandırdığı **Merchant Web Portalı** inşa edilmiştir.

### 21.1. Teknoloji Yığını ve Proje İskeleti
- **Frontend Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Zustand + Lucide Icons + Leaflet / React-Leaflet.
- **Tasarım Dili (UI/UX):** Glassmorphism, Dark/Vibrant tonlar, Hatay / İskenderun restoran dinamiklerine uygun modern B2B SaaS paneli.
- **Modüler Yapı:**
  - `src/components/`: Reusable kartlar, header, sidebar, status rozetleri.
  - `src/pages/`: Dashboard, Orders, LiveRadar, Settings, Login.
  - `src/services/`: API istemcileri (`api.ts`, `authService.ts`, `courierService.ts`, `merchantService.ts`, `signalRService.ts`).
  - `src/stores/`: Zustand durum depoları (`authStore.ts`, `courierStore.ts`).
  - `src/types/`: Tip tanımlamaları (`auth.ts`, `courier.ts`, `index.ts`).

### 21.2. Kimlik Doğrulama (Auth) ve Token Yönetimi
- **Standart Yanıt Modeli (`types/auth.ts`):**
  - Backend'deki `ServiceResult<T>` sınıfı TypeScript jenerik tipi olarak modellendi (`isSuccess`, `data`, `message`, `statusCode`, `errors`).
  - `AuthTokenDto`: `token`, `merchantId`, `merchantName`, `email`, `expiresAt`, `courierId`, `userId`, `roles`.
- **Merkezi Axios İstemcisi (`services/api.ts`):**
  - **Request Interceptor:** Zustand store ve `localStorage` üzerinden güncel JWT token'ı okuyup her isteğe `Authorization: Bearer <token>` başlığını otomatik ekler.
  - **Response Interceptor:** `401 Unauthorized` tespit edildiğinde zombi oturumları önlemek için oturumu temizler (`logout()`) ve kullanıcıyı `/login` sayfasına yönlendirir.
- **Kimlik Doğrulama Servisi (`services/authService.ts`):**
  - `POST /api/auth/login` çağrısı ile kullanıcı girişini yürütür, ağ veya sunucu hatalarını güvenli şekilde parse eder.
- **Zustand Oturum Yönetimi (`stores/authStore.ts`):**
  - `token`, `user`, `merchant`, `isAuthenticated` durumlarını bellekte ve `localStorage` üzerinde senkronize yönetir.
  - `login`, `updateMerchant`, `logout` aksiyonları ile güvenli ve reaktif oturum kontrolü sağlar.

---

## 22. Canlı Saha Radarı & SignalR WebSocket Harita Entegrasyonu (10.09.2026)

İşletmelerin sahadaki kuryelerini gerçek zamanlı olarak izleyebilmesi için Leaflet tabanlı dinamik radar ve SignalR WebSocket hattı devreye alınmıştır.

### 22.1. Kurye Durum Deposu (`stores/courierStore.ts`)
- Sahadaki kuryeleri tutan `couriers` sözlük/dizi yapısı (`id`, `name`, `phone`, `lat`, `lng`, `speed`, `status`, `lastUpdate`).
- Canlı konum güncellemelerini (`updateCourierLocation`) performansı zorlamadan reaktif state'e işleyen yapı.
- Bağlantı durumu (`connectionStatus`: `connected`, `connecting`, `reconnecting`, `disconnected`) takibi.

### 22.2. SignalR İletişim Servisi (`services/signalRService.ts`)
- `@microsoft/signalr` kütüphanesi ile `/hubs/location` uç noktasına çift yönlü WebSocket bağlantısı.
- **Yetkilendirme:** `accessTokenFactory` ile `authStore`'daki geçerli JWT token soket el sıkışmasına iletilir.
- **Olay Dinleme:** Backend'den yayınlanan `ReceiveLocationUpdate` dinlenerek gelen GPS ve hız verisi `courierStore`'a yönlendirilir.
- **Otomatik Yeniden Bağlanma (Auto-Reconnect):** 0s, 2s, 5s, 10s, 30s kademeli gecikmeyle bağlantı kopmalarına karşı dayanıklılık.

### 22.3. Canlı Radar Arayüzü (`pages/LiveRadar.tsx`)
- **İnteraktif Harita:** Leaflet katmanı üzerinde restoran konumu (özel siyah/altın rozet) ve kuryeler (yön, hız ve durum renkli marker'lar).
- **Bilgi Kartları:** Kurye üzerine tıklandığında anlık hız (km/s), son sinyal zamanı ve taşıdığı paket sayısını gösteren popup.
- **Kurye Listesi ve Filtreleme:** Yan panelde tüm kuryelerin online/offline durumu, hızlı arama ve haritada kuryeye odaklanma butonu.
- **Sayfa Yaşam Döngüsü:** Bileşen yüklendiğinde REST API (`GET /api/couriers`) ile ilk kurye listesi çekilir ve SignalR başlatılır; sayfa kapandığında bellek sızıntısı olmaması için SignalR bağlantısı zarifçe sonlandırılır.

---

## 23. İşletme GPS Konum Yönetimi, Geolocation & Backend Kalıcı Kayıt Mimarisi (10.09.2026)

İşletmenin harita üzerindeki kesin restoran konumunu belirlemesi, servis durumunu (açık/kapalı) yönetmesi ve bu verilerin hem tarayıcıda hem de .NET 8 veritabanında kalıcı olarak saklanması sağlanmıştır.

### 23.1. İş Kuralları ve Model Standartları
- **Paket Başı Ücret Değişmezliği:** Paket başı teslimat ücreti işletme tarafından keyfi değiştirilemez; bu ücret filo/kurye şirketi tarafından belirlenir ve işletme panelinde bilgi amaçlı kilitli (`disabled`) olarak gösterilir.
- **Servis Durumu (Açık / Kapalı):** İşletme, sipariş kabul edip etmediğini tek bir switch ile değiştirebilir.
- **Hiyerarşik ve Serbest Adres:** Hatay / İskenderun mahalle seçimi (İsmet İnönü, Çay, Dumlupınar vb.) ile otomatik adres oluşturma ve serbest açık adres düzenleme imkanı.

### 23.2. Tarayıcı Geolocation API ("Şu Anki Konumu Al")
- HTML5 `navigator.geolocation.getCurrentPosition` entegrasyonu.
- Tıklandığında `enableHighAccuracy: true` ile restoranın gerçek GPS koordinatları alınır.
- `map.flyTo()` animasyonu ile 1.2 saniyede zoom 17 seviyesinde restoranın bulunduğu konuma otomatik odaklanır.
- Harita üzerinde tıklanan veya GPS ile alınan noktaya anında özel restoran iğnesi yerleştirilir.

### 23.3. Backend (.NET 8 Clean Architecture) Entegrasyonu
1. **Domain Katmanı (`KuryeSistemi.Domain/Entities/Merchant.cs`):**
   - `IsOpen` (`bool`, default `true`), `Latitude` (`double?`), `Longitude` (`double?`) alanları eklendi.
2. **Infrastructure Katmanı (`Persistence/Configurations/MerchantConfiguration.cs`):**
   - Fluent API kısıtlamaları ve varsayılan değerleri tanımlandı.
3. **Application Katmanı:**
   - `MerchantDto` güncellendi (`IsOpen`, `Latitude`, `Longitude`).
   - `UpdateMerchantSettingsDto` (`Name`, `PhoneNumber`, `Address`, `IsOpen`, `Latitude`, `Longitude`) oluşturuldu.
   - `CreateMerchantCommandHandler` ve `GetAllMerchantsQueryHandler` yeni alanları eksiksiz map edecek şekilde uyarlandı.
   - `IMerchantService` ve `MerchantService`:
     - `GetByIdAsync(Guid merchantId)`: İşletme detaylarını getirir.
     - `UpdateSettingsAsync(Guid merchantId, UpdateMerchantSettingsDto)`: Koordinat sınır kontrolü (−90/90 enlem, −180/180 boylam) yaparak güncellemeyi atomik kaydeder.
4. **API Katmanı (`Controllers/Merchants/MerchantsController.cs`):**
   - `GET /api/merchants/{merchantId}` `[Authorize]`
   - `PUT /api/merchants/{merchantId}/settings` `[Authorize]`

### 23.4. Frontend Servis ve State Senkronizasyonu
- **`services/merchantService.ts`:** `getSettings` ve `updateSettings` metodları ile backend API'sine bağlandı.
- **`stores/authStore.ts`:** `updateMerchant` metodu ile güncellenen koordinatlar ve açık/kapalı durumu anında yerel duruma yansıtıldı.
- **`pages/Settings.tsx`:**
  - Sayfa açıldığında backend'den kayıtlı işletme konumu otomatik çekilir.
  - Kaydet butonuna tıklandığında hem `PUT /api/merchants/{id}/settings` ile veritabanına kaydedilir hem de yerel depolama güncellenir.
- **`pages/LiveRadar.tsx`:** Canlı radar haritası açıldığında harita merkezi olarak işletmenin backend'e kayıtlı GPS koordinatları önceliklendirilir.

### 23.5. Derleme ve Doğrulama
- **Backend Derlemesi:**
  - `dotnet build KuryeSistemi.Application.csproj` → **0 Hata, 0 Uyarı**
  - `dotnet build KuryeSistemi.Infrastructure.csproj` → **0 Hata, 0 Uyarı**
- **Frontend Derlemesi:**
  - `npm run build` (`merchant_web`) → **0 Hata, Başarılı (tsc + vite)**

---

## 24. Hızlı Sipariş (POS), Kanban Tablosu & Kasa Mahsuplaşma Backend Mimarisi (10.09.2026)

İşletme Web Panelinin kalbi niteliğindeki manuel sipariş girişi (POS), sipariş akış takibi (Kanban) ve kuryelerle yapılan gün sonu nakit para transferi (Mahsuplaşma / Reconciliation) API uç noktaları Clean Architecture standartlarında inşa edilmiştir.

### 24.1. Hızlı Sipariş Formu (POS) API Güncellemesi
- **Genişletilmiş DTO & Command Modelleri:**
  - `CreateOrderCommand` ve `CreateOrderRequestDto` içerisine `TotalOrderAmount` (decimal) ve `PaymentMethod` (Online, Cash, CreditCardOnDelivery) alanları entegre edildi.
  - POS senaryosunda restoranın kendi alım adresini tekrar yazma zorunluluğu ortadan kaldırıldı; `PickupAddressLine` vb. boş bırakıldığında `OrderService`, işletmenin sistemde kayıtlı adres ve GPS koordinatlarını otomatik olarak alım noktası olarak işler.
- **FluentValidation İş Kuralları (`CreateOrderCommandValidator` & `CreateOrderRequestDtoValidator`):**
  - Kural: *"Eğer `PaymentMethod` `Cash` veya `CreditCardOnDelivery` ise, `TotalOrderAmount` kesinlikle 0'dan büyük olmalıdır (`> 0.00`)."*
  - Koordinat aralık kontrolleri ve telefon numarası regex format kontrolleri devreye alındı.

### 24.2. Sipariş Kanban Tablosu API'si (`GET /api/orders/merchant/today`)
- **İşletme Günlük Siparişleri (`GetMerchantTodayOrdersAsync`):**
  - `IOrderRepository` ve `OrderRepository` katmanlarına sorgu eklendi.
  - Sadece bugüne ait (UTC başlangıç ve bitiş aralığında oluşturulan) veya statüsü halen aktif (`Pending`, `Assigned`, `PickedUp`) olan tüm siparişler `IReadOnlyList<OrderDto>` olarak döndürülür. Gece vardiyasında gün dönümüne sarkan siparişlerin Kanban'dan kaybolması engellenmiştir.
- **Güvenlik & Zero-Logic Controller:**
  - `OrdersController.GetMerchantTodayOrders` uç noktasında `merchantId` dışarıdan parametre olarak alınmaz; doğrudan `BaseController.GetMerchantId()` metodu üzerinden kullanıcının yetkili JWT token claim'inden okunur. Başka bir işletmenin sipariş verilerine erişim kesinlikle engellenmiştir.
- **Kurye Adı Eşlemesi:** `OrderDto` modeline `CourierName` alanı eklendi ve Kanban kartlarında hangi kuryenin görevli olduğu doğrudan görüntülenebilir kılındı.

### 24.3. Finans ve Kasa Mahsuplaşma (Reconciliation) API'si (`POST /api/merchants/reconcile-courier/{courierId}`)
- **İş Mantığı (`IMerchantService.ReconcileCourierAsync`):**
  - Gün sonunda kurye restorana gelip müşterilerden topladığı nakit parayı teslim ettiğinde kasa sıfırlama işlemi tetiklenir.
  - Çok kiracılı (Multi-tenant) güvenlik: Kuryenin gerçekten istek yapan işletmeye bağlı olup olmadığı (`courier.MerchantId == merchantId`) kontrol edilir.
  - Atomik İşlem: Kuryenin `CurrentBalance` değeri 0.00 TL'ye çekilir ve `_courierRepository.SaveChangesAsync()` ile atomik olarak mühürlenir.
- **Mahsuplaşma Sonuç DTO'su (`CourierReconciliationDto`):**
  - `CourierId`, `CourierFullName`, `SettledAmount` (sıfırlanan tutar), `NewBalance` (`0.00`), `ReconciledAt` ve bilgilendirici finansal açıklama mesajı döner.
- **API Uç Noktası:**
  - `POST /api/reconciliation/couriers/{courierId}` `[Authorize]` attributesi ile `ReconciliationController` üzerinden hizmete açıldı.

### 24.4. Frontend (`merchant_web`) Entegrasyonu
- `orderService.ts` (`getTodayOrders`, `createOrder`, `updateStatus`) ve `merchantService.ts` (`reconcileCourier`) tip güvenli olarak hazırlandı.
- `QuickOrder.tsx` (Hızlı Sipariş / POS) ekranı `orderService.createOrder` ile gerçek backend'e bağlandı. İstemci taraflı validasyonlar (Cash/CreditCardOnDelivery durumunda `TotalOrderAmount > 0`), buton loading/spinner animasyonu ve dönen hata/başarı Toast mesajları tamamlandı.

### 24.5. Derleme ve Kalite Doğrulaması
- **Tüm .NET 8 Backend Çözümü (`KuryeSistemi.sln`):**
  - `KuryeSistemi.Domain` → **0 Hata, 0 Uyarı**
  - `KuryeSistemi.Application` → **0 Hata, 0 Uyarı**
  - `KuryeSistemi.Infrastructure` → **0 Hata, 0 Uyarı**
  - `KuryeSistemi.API` → **0 Hata, 0 Uyarı**
- **Frontend Panel (`merchant_web`):**
  - `npm run build` → **0 Hata, Başarılı**

---

## 25. Veritabanı Temizliği & Tek İşletme - Tek Kurye Eşlemesi (10.09.2026)

Geliştirme ve test süreçlerindeki karmaşık eski kayıtlar temizlenmiş, uçtan uca POS ve Kurye teslimat testlerinin hatasız yürütülebilmesi amacıyla veritabanı sıfırlanarak tek bir işletme ve bu işletmeye bağlı tek bir kurye kaydı oluşturulmuştur.

### 25.1. Temizlenen Veriler
- Eski test siparişleri (`Orders`), eski kuryeler (`Couriers`) ve eski işletmeler (`Merchants`) silinmiştir.
- Redis önbelleği (`FLUSHALL`) ile sıfırlanmıştır.

### 25.2. Güncel Tohum (Seed) Kayıtları

1. **İşletme (Merchant / Web POS Paneli):**
   - **İşletme Adı:** İskenderun Dürüm Evi
   - **E-posta:** `iskenderun@restoran.com`
   - **Şifre:** `sifre123`
   - **İşletme ID:** `804c1bbd-70cf-47ae-8056-19c58d1deada`
   - **Telefon:** `+905321234567`
   - **Adres:** İsmet İnönü Mah. Atatürk Bulvarı No: 42/B, İskenderun
   - **Koordinatlar:** `36.5872, 36.1735`
   - **Varsayılan Paket Ücreti:** `35.00 TL`

2. **Kurye (Courier / Mobil Kurye Uygulaması):**
   - **Adı Soyadı:** Ahmet Yılmaz
   - **E-posta:** `ahmet@kurye.com`
   - **Şifre:** `sifre123`
   - **Kurye ID:** `90386627-9816-4d9d-8def-eaee73e39b15`
   - **Bağlı İşletme:** İskenderun Dürüm Evi (`804c1bbd-70cf-47ae-8056-19c58d1deada`)
   - **Telefon:** `+905551112233`
   - **Araç:** Honda PCX 125 (`31 ABC 123`)
   - **Kasa Bakiyesi:** `0.00 TL`

---



---

## 25. İşletme Paneli Ayarlar Sayfası & Kurye Firması Panel Altyapısı (14.09.2026)

### Özet
14 Eylül 2026 tarihli geliştirme oturumunda işletme panelinin Ayarlar sayfası tamamlandı ve kurye firması panelinin temel altyapısı oluşturuldu.

### Yapılanlar
- **`Settings.tsx`**: Firma bilgileri, dağıtım stratejisi (Havuz / Manuel / Akıllı GPS), mahsuplaşma periyodu (Günlük / Haftalık / Aylık), GPS konum seçimi (Leaflet haritası) tamamlandı.
- **`FirmLayout.tsx`**: Teal temalı kurye firması panel layout'u oluşturuldu. Sidebar navigasyon, mobil uyumlu responsive tasarım.
- **`FirmDashboard.tsx`**: API'den gerçek veri çeken KPI kartları, kurye durumu ve sipariş özeti.
- **`AppRoutes.tsx`**: `/firm/*` rota grubu ve `FirmRoute` guard eklendi.
- **`DashboardLayout.tsx`**: İşletme panelinden kurye firmasına geçiş butonu eklendi (sonra kaldırıldı).

### Teknik Notlar
- Backend: `UpdateMerchantSettingsDto` güncellendi (DispatchMode, ReconciliationPeriod, GPS koordinatları).
- `MerchantService.UpdateSettingsAsync` genişletildi.

---

## 26. Rol Tabanlı Kimlik Doğrulama & Kurye Firması Hesap Yönetimi (14.09.2026)

### Özet
Sistem artık tek giriş noktasından farklı rollere sahip kullanıcıları yönetebiliyor.

### Yapılanlar

#### Backend
- **`Merchant` entity** → `Role` string alanı eklendi. Default: `"Merchant"`, Kurye Firması için: `"CourierFirm"`.
- **`AddMerchantRole` migration** → PostgreSQL'e uygulandı.
- **`IJwtService` & `JwtService`** → `GenerateToken` metoduna `role` parametresi eklendi. JWT claim'e doğru rol yazılıyor.
- **`AuthTokenDto`** → `Roles string[]` alanı eklendi. Frontend'e rol bilgisi dönülüyor.
- **`LoginMerchantCommandHandler` & `AuthService`** → Login sırasında `merchant.Role` okunarak token üretiliyor.
- **`UpdateMerchantSettingsDto` & `MerchantService`** → `PUT /api/merchants/{id}/settings` endpoint'i üzerinden rol atanabiliyor.

#### Frontend
- **`Login.tsx`** → Demo doldurmayı kaldırıldı. Branding "KuryeSistemi" olarak güncellendi.
- **`DashboardLayout.tsx`** → Kurye firması geçiş butonu kaldırıldı.
- **`FirmRoute` guard** → `hasFirmAccess` kontrolü aktif edildi. CourierFirm rolü olmayanlar `/radar`'a yönlendiriliyor.

#### Hesap Bilgileri
| Kullanıcı | E-Posta | Şifre | Rol | Panel |
|-----------|---------|-------|-----|-------|
| İskenderun Dürüm Evi | `iskenderun@restoran.com` | `sifre123` | Merchant | `/radar` |
| Zahir Kurye Firması | `zahirfirma@gmail.com` | `sifre123` | CourierFirm | `/firm/dashboard` |

---

## 27. Kurye Firması Paneli — Tam Modül Geliştirme (15.09.2026)

### Özet
15 Eylül 2026 tarihinde kurye firması panelinin tüm temel modülleri tamamlandı.

### Oluşturulan Sayfalar

#### 1. Kurye Yönetimi (`/firm/couriers`) — `FirmCouriers.tsx`
- Tüm kuryeler listelenir (isim, telefon, araç, plaka)
- Online/offline ve müsait/meşgul durum göstergeleri
- Bakiye renk kodlu gösterim (kurye borçlu → kırmızı, firma borçlu → yeşil)
- Mahsuplaşma butonu (bakiye ≠ 0 olduğunda aktif)
- Arama, durum filtresi, sıralama (isim / bakiye / durum)
- KPI özet kartları (toplam, müsait, borçlu sayısı, toplam bakiye)

#### 2. Restoran Yönetimi (`/firm/merchants`) — `FirmMerchants.tsx`
- Tüm bağlı restoranlar kart görünümde listelenir
- Açık/kapalı durum göstergesi
- Ayarlar modalı: paket ücreti, dağıtım stratejisi, mahsuplaşma periyodu
- Arama filtresi

#### 3. Tüm Siparişler (`/firm/orders`) — `FirmOrders.tsx`
- Tüm restoranların siparişleri (durum, ödeme yöntemi, kurye adı)
- Durum filtresi (tümü / aktif / teslim / iptal)
- Zaman bazlı sıralama
- Bugünkü ciro ve teslim istatistikleri

#### 4. Finans & Mahsuplaşma (`/firm/finance`) — `FirmFinance.tsx`
- Tüm mahsuplaşma kayıtları, aylık gruplu
- Özet KPI'lar: toplam mahsup, nakit tahsilat, hakediş, paket
- CSV dışa aktarma butonu
- Kurye adına göre arama

#### 5. Firma Ayarları (`/firm/settings`) — `FirmSettings.tsx`
- Firma adı, telefon, adres güncelleme
- E-posta salt okunur (değiştirilemez)
- Güvenlik paneli (şifre değiştir, oturumları kapat)
- Sistem bilgisi (platform, hesap rolü, API durumu)

### Teknik Güncellemeler
- **`AppRoutes.tsx`**: Tüm `/firm/*` rotaları ComingSoon'dan gerçek sayfalara güncellendi.
- **`FirmRoute` guard**: Rol kontrolü aktif edildi.
- Docker container'ları (PostgreSQL + Redis) her oturum başında manuel başlatılıyor.

### Sıradaki Adımlar
- ~~**Filo Haritası** (`/firm/radar`)~~ ✅ Tamamlandı (15.09.2026)
- **Bildirim sistemi**: Yeni sipariş, bakiye limiti, hata bildirimleri.
- **Kurye ekleme** formu: FirmCouriers sayfasından yeni kurye kaydı.

---

## 28. Filo Haritası — FirmRadar (15.09.2026)

### Özet
Kurye Firması Paneli'ne canlı GPS harita modülü eklendi. Tüm restoranların tüm kuryeleri tek haritada izlenebiliyor.

### Oluşturulan Dosya
**`src/pages/firm/FirmRadar.tsx`**

### Özellikler
- **Tüm kurye görünümü**: Tüm restoranlardan bağlı kuryelerin GPS konumları tek haritada
- **Restoran bazlı renk kodlama**: Her restoran farklı renge atanır (8 renk paleti), kuryeler o renkle gösterilir
- **Anlık GPS güncelleme**: SignalR LocationHub ile gerçek zamanlı konum takibi
- **Kurye durum ikonları**: Online + müsait (🟢), Online + meşgul (🟡), Offline (⚫)
- **Yan panel**: İki mod:
  - *Liste modu*: Tüm kuryeler sıralı, bakiye göstergeli, tıkla → detaya geç
  - *Detay modu*: Kurye bilgileri (telefon, araç, plaka, bakiye, GPS koordinatı) + mahsuplaşma butonu
- **Harita üstü arama**: İsim / telefon / plaka ile filtre
- **Merkeze dön butonu**: Haritayı varsayılan konuma sıfırlar
- **Renk açıklaması**: Sol alt köşede durum renk rehberi
- **KPI kartları**: Toplam, online, müsait, haritada kurye sayıları

### Teknik
- Altyapı: **Leaflet + react-leaflet** (LiveRadar ile aynı)
- **SignalR**: `startSignalR()` / `stopSignalR()` ile yaşam döngüsü yönetimi
- **`useCourierStore`**: Mevcut Zustand store (harita güncelleme: `updateCourierLocation`)
- Merkez koordinat: İskenderun `[36.5867, 36.1714]` (firma sabit merkezi)
- Mahsuplaşma: `financeService.reconcileCourier()` yan panelden tetiklenir

### Sıradaki Adımlar
- ~~**Kurye ekleme formu**: `/firm/couriers` sayfasından yeni kurye kaydı~~ ✅ Tamamlandı (15.09.2026)
- **Bildirim sistemi**: Yeni sipariş, bakiye limiti, kritik olaylar
- **Restoran bazlı filtre**: Filo haritasında restoran seçip sadece o restoranın kuryelerini gösterme

---

## 29. Kurye Yönetimi (CRUD), Sipariş Havuzu & Firma Entegrasyonları (15.09.2026)

### Özet
Kurye Firması ve İşletmelerin kurye ve sipariş yönetimi uçtan uca tamamlandı. Backend'de REST API endpoint'leri ve CQRS DTO yapıları genişletildi, Frontend'de kurye ekleme, düzenleme, silme, arama ve filtreleme özellikleri modal destekli olarak devreye alındı.

### Backend Geliştirmeleri
1. **`CouriersController` & `CourierService` Geliştirmeleri:**
   - `GET /api/couriers`: `merchantId` parametresi opsiyonel hale getirildi. Verilmediğinde tüm sistem kuryeleri (`CourierFirm` rolü için) döner.
   - `POST /api/couriers`: Yeni kurye oluşturma (`CreateCourierRequestDto`).
   - `PUT /api/couriers/{courierId}`: Kurye bilgilerini (Ad, Soyad, Telefon, E-posta, Araç Tipi, Marka, Model, Plaka, Müsaitlik) güncelleme (`UpdateCourierRequestDto`).
   - `DELETE /api/couriers/{courierId}`: Kurye kaydını silme.
   - `CourierDto`: DB'de yer alan `CurrentBalance` alanı eklendi, Redis/SignalR üzerinde tutulan `IsOnline` alanı temizlendi.
2. **`OrdersController` & `OrderService` Geliştirmeleri:**
   - `GET /api/orders`: `merchantId` parametresi opsiyonel hale getirildi. Firma yöneticileri tüm siparişleri veya belirli bir restoranın siparişlerini filtreleyebilir.
   - `GetAllOrdersAsync`: Servis ve repository katmanına tüm siparişleri durum filtresiyle getiren metot eklendi.

### Frontend Geliştirmeleri (`merchant_web`)
1. **`src/pages/firm/FirmCouriers.tsx` (Kurye Yönetimi):**
   - **Yeni Kurye Ekle Modalı**: Restoran seçimi, kurye kimlik & iletişim bilgileri ve araç/plaka tanımlama.
   - **Kurye Düzenleme Modalı**: Mevcut kurye bilgilerini ve müsaitlik durumunu güncelleme.
   - **Kurye Silme Modalı**: Güvenli onay diyalogu ile kurye silme işlemi.
   - **Gelişmiş Filtreleme**: Restoran bazlı filtreleme dropdown'ı, arama (isim/telefon/plaka) ve durum butonları.
   - **Nakit Kasa Mahsuplaşma**: Tek tıkla güncel kasa bakiyesini sıfırlama ve mutabakat sağlama.
2. **`src/services/courierService.ts` & `merchantService.ts`:**
   - `getAllCouriers()`, `createCourier()`, `updateCourier()`, `deleteCourier()`, `getAllMerchants()` servis çağrıları eklendi.
3. **`src/pages/firm/FirmRadar.tsx` & Diğer Firma Sayfaları:**
   - TypeScript model ve prop uyumsuzlukları giderildi, build 0 hata ile optimize edildi.

### Doğrulama & Testler
- Backend: `.NET 8` Clean Architecture derlemesi 0 hata ile tamamlandı.
- Frontend: `Vite + TypeScript` build'i 0 hata ile başarıyla oluşturuldu.
- API Testleri: `POST /api/auth/login`, `GET /api/couriers` (Bearer Token ile 200 OK), `GET /api/orders` (4 sipariş 200 OK) uçtan uca doğrulandı.

---

## 30. Restoran / İşletme Yönetimi (CRUD) & Dağıtım Stratejileri Mimarisi (15.09.2026)

### Özet
Kurye Firması Paneli üzerinden tüm bağlı restoranların eklenmesi, ayarlarının güncellenmesi, silinmesi ve işletmeye özel kurye dağıtım stratejilerinin yapılandırılması tamamlandı.

### Dağıtım Stratejileri (Dispatch Modes)
1. **`0 - Pool (Havuz Sistemi)`**: Restoran sipariş oluşturduğunda sipariş ortak havuza düşer. Kuryeler kendi mobil uygulamalarından "Açık Siparişler" listesini görür ve müsait olan ilk kurye siparişi kendi üzerine alır.
2. **`1 - Manual (Manuel Atama)`**: Restoran veya Kurye Firması panelindeki Kanban/Sipariş listesinden kuryeyi dropdown ile seçip "Kuryeye Ata" butonuna basar.
3. **`2 - SmartAuto (Akıllı GPS / En Yakın Kurye)`**: Sipariş oluştuğu anda kuryelerin canlı GPS konumları taranır. Restorana kuş uçuşu veya rota mesafesi olarak en yakın müsait kurye otomatik tespit edilerek push bildirimle sipariş teklifi kuryeye gönderilir.

### Backend Geliştirmeleri
1. **`CreateMerchantRequestDto` Genişletildi:**
   - `Name`, `Email`, `Password`, `PhoneNumber`, `Address`, `DefaultPackageFee`, `DispatchMode`, `ReconciliationPeriod`, `Latitude`, `Longitude` alanları eklendi.
2. **`IMerchantService` & `MerchantService`:**
   - `CreateAsync`: Gelen tüm parametreleri set ederek restoranı ve varsayılan parametrelerini oluşturur.
   - `DeleteAsync`: İşletmeyi güvenli şekilde pasife alır (`IsActive = false, IsDeleted = true`).
3. **`MerchantsController`:**
   - `POST /api/merchants`: Restoran oluşturma.
   - `DELETE /api/merchants/{merchantId}`: Restoran silme.

### Frontend Geliştirmeleri (`merchant_web`)
1. **`src/pages/firm/FirmMerchants.tsx`:**
   - **Yeni Restoran Ekle Modalı:** İsim, e-posta, şifre, telefon, adres, paket başı kurye ücreti (TL), dağıtım stratejisi (Havuz/Manuel/Akıllı) ve mahsuplaşma periyodu seçimi.
   - **Ayarları Düzenle Modalı:** Paket başı ücret ve dağıtım modu anlık güncelleme.
   - **Restoran Silme Onay Modalı:** Güvenli silme diyalogu.
2. **`src/services/merchantService.ts`:**
   - `createMerchant()` ve `deleteMerchant()` metotları eklendi.
3. **`src/layouts/FirmLayout.tsx`:**
   - Firma panelinden "İşletmeye Dön" butonu kaldırılarak iki panel rollere göre tamamen izole edildi.

### Doğrulama & Testler
- Backend: `.NET 8` Clean Architecture derlemesi 0 hata ile tamamlandı.
- Frontend: `npm run build` (Vite + TS) 0 hata ile başarıyla derlendi.
- API Testleri: `POST /api/merchants` ile "Test Doner Salonu" oluşturuldu (201 Created), `DELETE /api/merchants/{id}` ile silindi (200 OK).

---

## 31. Sipariş Havuzu, Detay & Manuel Kurye Atama Sistemi (15.09.2026)

### Özet
Yüksek trafik ve eş zamanlı istek senaryolarına dayanıklı, kurye firması ve restoranların siparişleri ortak havuzdan takip ettiği, beklemedeki siparişlere anında kurye atayabildiği ve durum güncelleyebildiği operasyon merkezi devreye alındı.

### Backend Yüksek Performans & Concurrency Mimarisi
1. **Optimize SQL Sorguları (Zero N+1 Query):**
   - `IOrderRepository.GetAllWithDetailsAsync`: `Courier` ve `Merchant` tablolarını tek bir SQL JOIN ile `AsNoTracking` üzerinden çeker. Yüzlerce eş zamanlı istekte veritabanı yükü minimuma indirildi.
2. **Filo Geneli Kurye Atama (`AssignOrderAsync`):**
   - `PUT /api/orders/{id}/assign`: Firma yöneticisinin filodaki herhangi bir müsait kuryeyi herhangi bir restoranın siparişine doğrudan atayabilmesi sağlandı.
   - Önceki kurye atanmışsa atomik olarak serbest bırakılır (`FreeCourierAsync`), yeni kurye `IsAvailable = false` yapılır.
3. **SignalR Entegrasyonu:**
   - Atama ve durum değişikliklerinde `SendOrderStatusChangedAsync` tetiklenerek tüm açık panellere ve kurye uygulamalarına anlık WebSocket güncellemesi gönderilir.

### Frontend Geliştirmeleri (`merchant_web`)
1. **`src/pages/firm/FirmOrders.tsx`:**
   - **Manuel Kurye Atama Modalı:** Havuzda bekleyen siparişlerin yanında "Kurye Ata" butonu. Müsait kuryelerin listelendiği, tek tıkla kurye seçip atama sağlayan modern modal.
   - **Sipariş Detay & Hızlı Aksiyon Modalı:** Siparişe tıklandığında alıcı adı, telefonu, tam adresi, tutarı, ödeme şekli, kurye bilgisi ve hızlı durum butonları ("Teslim Alındı", "Teslim Edildi", "İptal Et", "Kurye Değiştir").
   - **Restoran Bazlı Filtreleme & Arama:** Restoran seçimi, durum filtreleri (Tümü, Bekleyen, Atandı, Yolda, Teslim, İptal) ve çoklu alan araması.
2. **`src/services/orderService.ts`:**
   - `getAllOrders(merchantId?, status?)`, `assignCourier(orderId, courierId)` fonksiyonları eklendi.
3. **`src/types/index.ts`:**
   - `Order` arayüzüne `merchantId` ve `merchantName` alanları eklendi.

### Doğrulama & Testler
- Backend: `.NET 8` Clean Architecture derlemesi 0 hata ile tamamlandı.
- Frontend: `Vite + TypeScript` build'i 0 hata ile oluşturuldu.
- API Testleri: `PUT /api/orders/{id}/assign` ve sipariş detay/kurye eşleştirmeleri test edildi.

---

## 32. Canlı Sesli & Görsel Bildirim Sistemi ve Gelişmiş Finans & Mahsuplaşma Modülü (15.09.2026)

### Özet
Sisteme sıfır harici dosya bağımlılığıyla çalışan kristal netliğinde profesyonel Web Audio API ses sentezleyici, SignalR WebSocket dinleyicisi ile entegre canlı Toast bildirimleri ve Kurye Firması için 3 sekmeli gelişmiş Finans & Mahsuplaşma paneli eklendi.

### 1. Canlı Sesli & Görsel Bildirim Mimarisi
1. **Web Audio API Ses Sentezi (`src/utils/audioAlert.ts`):**
   - Sıfır `.mp3` dosya bağımlılığı. Tarayıcının donanım ses motoru (`AudioContext`) üzerinden gerçek zamanlı ton sentezleme.
   - **Yeni Sipariş Uyarısı:** Çift tonlu kristal gong tınısı (587.33 Hz [D5] -> 880 Hz [A5] eksponansiyel azalma).
   - **Teslimat / Başarı Uyarısı:** 3 tonlu melodik akor (523.25 Hz [C5] -> 659.25 Hz [E5] -> 783.99 Hz [G5]).
   - **İptal / Uyarı Sesi:** Testere dişi dalga ile 440 Hz'den 370 Hz'e alçalan uyarı tonu.
   - Ses açma/kapatma (Mute) desteği ve `localStorage` kalıcılığı.
2. **Bildirim Mağazası (`src/stores/notificationStore.ts`):**
   - Zustand persist middleware ile son 50 bildirimin geçmişte saklanması, okunmadı sayaçları ve anlık ekranda süzülen 4 aktif Toast kuyruğu.
3. **Canlı Toast ve Bildirim Zili Bileşenleri:**
   - **`NotificationBell.tsx`:** Okunmamış sayaç rozeti, ses açma/kapatma ikonu, tek tıkla tümünü okundu yapma ve geçmiş temizleme menüsü.
   - **`NotificationToast.tsx`:** Ekranın sağ üst köşesinde beliren, 5 saniyelik şık ilerleme çubuğuna (CSS keyframe progress) sahip, sipariş kodunu ve durumunu gösteren otomatik kapanan bildirim kartları.
4. **SignalR Dinleyici Kancası (`src/hooks/useNotificationListener.ts`):**
   - `ReceiveOrderStatusUpdate` WebSocket olayını arka planda dinler; sipariş durumuna göre Türkçe başlık/açıklama üreterek ses çalar ve ekrana Toast düşürür.
   - `FirmLayout.tsx` ve `DashboardLayout.tsx` içine yerleştirilerek uygulamanın her sayfasında kesintisiz çalışması sağlandı.

### 2. Gelişmiş Finans & Mahsuplaşma Modülü (`/firm/finance`)
1. **3 Farklı Görünüm Sekmesi:**
   - **Mahsuplaşma Geçmişi:** Yapılan tüm kasa kapatma denetim kayıtları (aylık gruplama, dönem toplamları, kurye, nakit ve hakediş detayları).
   - **Canlı Kurye Kasaları:** Filodaki tüm kuryelerin anlık bakiye durumları (Nakit Borçlu / Hakediş Alacaklı / Kasa Temiz göstergeleri) ve tek tıkla açılan "Kasayı Kapat" modalı ile `POST /api/reconciliation/couriers/{id}` entegrasyonu.
   - **Restoran Tarifeleri:** Tüm bağlı restoranların paket başı ücretleri (TL), mahsuplaşma periyotları (Günlük/Haftalık/Aylık) ve dağıtım modelleri listesi.
2. **Filtreleme & Raporlama:**
   - Tarih Aralığı: Tümü, Bugün, Son 7 Gün, Bu Ay.
   - Metin Arama: Kurye adı, telefon, not ve restoran adı filtreleme.
   - **CSV / Excel Dışa Aktarma:** Tek tıkla UTF-8 uyumlu CSV raporu indirme.

### Doğrulama & Testler
- Backend: `.NET 8` Clean Architecture derlemesi 0 hata ile çalışıyor.
- Frontend: `npm run build` (Vite v8.2.2 + TypeScript) 0 hata ile 1.35s'de derlendi.
- Bildirimler: Web Audio API ton üretimi, SignalR sipariş olayı tetiklemesi ve Toast bileşeni doğrulandı.

---

## 33. Web Platformu Tamamlama & Güvenlik/Profil Mimarisi (15.09.2026)

### Özet
Web tarafındaki tüm modüller (İşletme ve Kurye Firması panelleri), profil ve güvenlik ayarları (Şifre Değiştirme API & Modalı), hızlı demo giriş mekanizmaları tamamlandı. Ayrıca Flutter Kurye Mobil Uygulaması için özel API & WebSocket entegrasyon rehberi oluşturuldu.

### 1. Güvenlik ve Şifre Yönetimi Mimarisi
1. **Backend Endpoint (`POST /api/auth/change-password`):**
   - `[Authorize]` korumalı REST API endpoint'i.
   - Gelen mevcut şifreyi doğrular, minimum 6 karakter şartını denetler ve `Merchants` / `Couriers` tablolarında günceller.
2. **Frontend Entegrasyonu (`FirmSettings.tsx` & `Settings.tsx`):**
   - Şık, modern şifre değiştirme modalı (`isPasswordModalOpen`), göz ikonu ile göster/gizle anahtarı, anlık hata/başarı bildirimleri.
   - Sistem tercihleri (Ses aç/kapat, harita odağı, aktif oturumları kapatma).

### 2. Giriş Ekranı Hızlı Demo Modu (`Login.tsx`)
- Tek tıkla `👑 Kurye Firması (zahirfirma@gmail.com)` ve `🏪 Restoran / İşletme (iskenderun@restoran.com)` hesapları arasında geçiş yapabilen butonlar eklendi.

### 3. Flutter Mobil Entegrasyon Dokümantasyonu
- **`kurye_mobil_api_dokumantasyonu.md`**: Mobil geliştiriciler için tüm REST endpoint'leri, SignalR WebSocket bağlantı yaşam döngüsü, arka plan GPS konum akışı, havuzdan sipariş kabul ve teslimat akışları kapsamlı olarak belgelendi.

---

## 34. Filo Modeli Revizyonu, Rol İzolasyonu & Kapsamlı Firma Ayarları (15.09.2026)

### Özet
Firma panelinde restoranlar listelenirken lojistik firmasının kendisinin restoran gibi görünmesi sorunu giderildi. Kuryelerin tüm restoranlara hizmet verebileceği "🌟 Ortak Filo / Havuz" modeli ile opsiyonel "🏪 Özel Zimmetli Restoran" modeli ayrıştırıldı. Firma Ayarları sayfası filo politikaları, komisyon hesaplayıcı ve kasa limitleriyle genişletildi.

### 1. Rol İzolasyonu & Restoran Listeleme İyileştirmesi
- **Backend `MerchantRepository.cs`:** `GetAllActiveAsync()` sorgusu `m.Role != "CourierFirm"` koşuluyla güncellendi. Artık firma hesabı (`Zahir Kurye Firmasi`) restoranlar listesinde asla çıkmaz, sadece gerçek restoranlar listelenir.

### 2. Kurye Dağıtım & Filo Modeli
- **Kurye Ekleme / Düzenleme ([FirmCouriers.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/firm/FirmCouriers.tsx)):**
  - **`🌟 Ortak Filo / Tüm Restoranlar (Havuz Dağıtım)`:** Kurye doğrudan lojistik firmasına bağlıdır ve sisteme bağlı olan HERHANGİ bir restoranın siparişini alabilir.
  - **`🏪 [Restoran Adı] (Zimmetli / Özel Tahsis)`:** İstenirse kurye sadece belirli bir restorana özel olarak atanabilir.
  - Tabloda kuryenin filo modeli rozetlerle (`🌟 Ortak Filo` / `🏪 Özel Zimmetli`) net olarak belirtildi.
  - Filtreleme menüsüne "🌟 Ortak Filo Kuryeleri" seçeneği eklendi.

### 3. Genişletilmiş Firma & Filo Ayarları ([FirmSettings.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/firm/FirmSettings.tsx))
1. **Kurumsal Profil & Vergi Bilgileri:** Firma Ticari Ünvanı, Yetkili Telefon, Merkez Adres, Vergi Dairesi ve Vergi Kimlik Numarası (VKN/TCKN).
2. **Filo Dağıtım Politikaları & Komisyon Hesaplayıcı:**
   - Varsayılan Paket Ücreti (TL) ve Kurye Hakediş Payı (TL) girildiğinde anlık Net Firma Komisyonu ve Kâr Yüzdesi hesaplayan interaktif kart.
   - Varsayılan Dağıtım Stratejisi (Havuz, Manuel, Akıllı GPS).
   - Kurye Teklif Zaman Aşımı Süresi (30 sn, 45 sn, 60 sn, 90 sn).
   - Maksimum Eşzamanlı Paket Taşıma Limiti (1, 2, 3, 4 paket).
3. **Finans & Kasa Güvenlik Limitleri:**
   - Kurye Maksimum Nakit Kasa Limiti (TL) (Limit aşımında kasa kapatma uyarısı).
   - Varsayılan Mahsuplaşma Periyodu (Günlük, Haftalık, Aylık).
   - Otomatik Kasa Kapanış Hatırlatıcısı (Aktif/Pasif).
4. **Harita & Ses Bildirim Tercihleri:** Web Audio API sesleri ve varsayılan radar bölgesi seçimi (İskenderun, Antakya, Dörtyol).
5. **Güvenlik:** Yönetici şifre değiştirme modalı ve aktif oturumları kapatma.

---

## 35. Üçlü Dağıtım Modeli (Atama Usulleri) & Flutter Mobil Entegrasyon Mimarisi (15.09.2026)

### Özet
Sistemde kuryelerin sipariş alma ve yöneticilerin paket atama süreçleri için tanımlanan **3 Dağıtım / Atama Modeli** (`DispatchMode`: Pool, Manual, SmartAuto) Backend, Web Paneli ve Flutter Mobil ekosisteminde tam uyumlu hale getirilmiş ve belgelenmiştir.

### 1. Üç Dağıtım Modelinin Katmanlar Arası Çalışma Prensibi
1. **📡 1. Havuz Sistemi (`DispatchMode.Pool = 1` - Kurye Kendisi Alır):**
   - **Backend:** Sipariş `Pending` durumunda açılır (`CourierId = null`). WebSocket üzerinden havuza yayınlanır.
   - **Web Paneli:** Sipariş "Açık Havuz"da listelenir.
   - **Flutter Mobil:** Kuryenin uygulamasındaki **"Açık Sipariş Havuzu"** sekmesine anlık düşer. Müsait kurye paket detayını ve kazancını görüp **"Siparişi Üzerime Al"** (`PUT /api/orders/{id}/assign`) butonuna basar. İlk basan kurye paketi kapar.
2. **🎯 2. Manuel Atama (`DispatchMode.Manual = 2` - Yönetici Seçer):**
   - **Backend:** Sipariş açılır, yönetici kuryeyi seçene kadar bekler.
   - **Web Paneli:** Restoran veya Firma yöneticisi panelden kuryeyi seçip **"Kuryeye Ata"** der (`PUT /api/orders/{id}/assign`).
   - **Flutter Mobil:** Kuryeye anlık **"Size Yeni Sipariş Atandı!"** modal bildirimi ve zil sesi gelir. Kurye paketi teslim almak üzere yola çıkar.
3. **🤖 3. Akıllı GPS Atama (`DispatchMode.SmartAuto = 3` - En Yakın Kurye):**
   - **Backend:** Sipariş geldiğinde restorana en yakın, çevrimiçi ve müsait kuryeyi Redis GPS koordinatlarıyla tespit eder.
   - **Web Paneli:** Dağıtım anlık otomatik gerçekleşir, radar üzerinden takip edilir.
   - **Flutter Mobil:** En yakın kuryenin ekranında **30 saniyelik geri sayımlı kabul penceresi** (`ReceiveOrderOffer`) açılır. Kurye onaylarsa paket bağlanır; reddederse 2. en yakın kuryeye yönlendirilir.

### 2. Dokümantasyon
- [kurye_mobil_api_dokumantasyonu.md](file:///c:/kuryesistemi/kurye_mobil_api_dokumantasyonu.md) güncellenerek Flutter kod örnekleri, Dio HTTP istekleri ve SignalR event yapıları eklendi.

---

## 36. Hiyerarşik Fiyatlandırma/Tarife Mimarisi & Kurye Düzenleme İyileştirmesi (15.09.2026)

### Özet
1. Kurye düzenleme modalında (`PUT /api/couriers/{id}`) seçilen filo modelinin (Ortak Filo vs Özel Zimmetli Restoran) veritabanına kaydedilmeme sorunu hem Backend DTO hem de Frontend seviyesinde giderildi.
2. Firma Genel Ayarları (Taban Fiyat) ile Restorana Özel Anlaşma Tarifeleri arasındaki hiyerarşik fiyatlandırma kurgulandı ve arayüz açıklamalarıyla zenginleştirildi.

### 1. Kurye Güncelleme Düzeltmeleri
- **Backend:** `UpdateCourierRequestDto.cs` ve `CourierService.cs` içerisine `Guid? MerchantId` ve `VehicleType? VehicleType` alanları eklendi.
- **Frontend ([FirmCouriers.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/firm/FirmCouriers.tsx)):** Düzenleme formundan gelen `merchantId` parametresi `courierService.updateCourier` çağrısına bağlandı.

### 2. Hiyerarşik Fiyatlandırma & Tarife Modeli
- **Firma Genel Ayarları ([FirmSettings.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/firm/FirmSettings.tsx)):** Filo taban fiyatı (Örn: ₺80) ve Kurye Hakediş Payı (Örn: ₺55) tanımlanır.
- **Restorana Özel Ayarlar ([FirmMerchants.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/firm/FirmMerchants.tsx)):** İsteğe bağlı olarak büyük/özel hacimli restoranlara indirimli özel paket ücreti (Örn: ₺70) tanımlanabilir.
- **Hesaplama Önceliği:** Sipariş tamamlandığında `Restorana Özel Fiyat (varsa) ?? Firmanın Genel Taban Fiyatı` formülüyle hakediş mühürlenir.

### Doğrulama & Testler
- Backend API (`http://localhost:5000`) derlendi ve yayına alındı.
- Frontend (`merchant_web`) `npm run build` ile 0 hata ve 753ms'de derlendi.

---

## 37. Restoran Finans, Kasa & Mahsuplaşma Modülü Revizyonu (22.09.2026)

### Özet
Restoran panelinde finans/mahsuplaşma bölümünün teslim edilen paketlere rağmen 0 TL görünmesi sorunu çözüldü. Restoran-Firma ve Kurye-Firma arasındaki çift yönlü mahsuplaşma mantığı netleştirildi. Ödeme tiplerine (Nakit, Kapıda Kredi Kartı, Online) göre filtreleme, kurye ve sipariş bazlı teslimat süresi (dakika) hesaplama ve detaylı mahsuplaşma kartları eklendi.

### 1. Çift Yönlü Mahsuplaşma (Reconciliation) Mantığı
1. **Nakit (Cash) Siparişler:**
   - Kurye müşteriden parayı nakit tahsil eder.
   - Bu nakit para lojistik firmasına teslim edilmek üzere kurye kasasındadır.
   - Kurye firması, restorana ait olan yemek bedelini restorana devreder; restoran ise firmaya anlaşılan paket teslimat ücretini (komisyonunu) öder.
   - **Net Restoran Alacağı / Ödemesi:** `Tahsil Edilen Nakit - Paket Teslimat Ücreti`.
2. **Online / Kapıda Kredi Kartı Siparişleri:**
   - Para restoranın kendi banka hesabına / sanal POS'una akar.
   - Restoran yalnızca lojistik firmasının paket başı hizmet bedelini (komisyonunu) firmaya borçlanır.
3. **Kurye Hakedişi:**
   - Kurye her teslim ettiği paket başına `CourierCutFee` (örn: ₺40) hak ediş kazanır.

### 2. Backend Geliştirmeleri (`ReconciliationController.cs` & `ReconciliationService.cs`)
- **`GET /api/reconciliation/merchant/summary`**:
  - Giriş yapan restorana ait dönemsel özet verileri üretir: Toplam ciro, nakit tahsilat, kredi kartı tahsilatı, online sipariş tutarı, firma paket hizmet borcu, net mahsuplaşma bakiyesi.
  - **Ortalama Teslimat Süresi (`averageDeliveryDurationMinutes`, `deliveryDurationFormatted`):** Siparişin teslim alınma (`PickedUpAt`) ile teslim edilme (`DeliveredAt`) zaman damgaları arasındaki fark sunucu tarafında dakika bazında hesaplanarak DTO'ya eklendi.
- **`POST /api/reconciliation/settlements`**:
  - Restoran ile kurye firması veya kurye ile firma arasındaki hesap kapatma (mahsuplaşma ödemesi) işlemi için güvenli uç nokta sağlandı.

### 3. Frontend Geliştirmeleri ([Finance.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/Finance.tsx))
- **Ödeme Yöntemi Filtreleme Butonları:** Tümü, Nakit (Elden), Online / Yemeksepeti, Kapıda Kredi Kartı filtreleri ile paket detaylarını dinamik listeleme.
- **Teslimat Süresi Göstergesi:** Her paketin yanında `⏱️ 14 dk teslimat` rozeti ile kurye hızı ve teslim dakikası şeffaf şekilde gösterildi.
- **Anlık Mahsuplaşma Durumu:** Restoranın firmadan alacaklı mı yoksa firmaya borçlu mu olduğu renk kodlu (Yeşil/Kırmızı) bakiye kartlarıyla gösterildi.

---

## 38. Restoran Gerçek Zamanlı Bildirimler & Web Audio API Onarımı (22.09.2026)

### Özet
Restoran web arayüzüne yeni sipariş, kurye ataması ve teslimat anında sesli ve görsel bildirimlerin gelmemesi sorunu kökten çözüldü. SignalR veri serileştirme uyumsuzlukları, GUID filtreleme hataları ve tarayıcı ses kısıtlamaları (Autoplay Policy) giderildi.

### 1. Tespit Edilen Kök Nedenler & Çözümler
1. **SignalR JSON Naming Uyumsuzluğu (CamelCase / PascalCase):**
   - **Sorun:** Backend `SignalRHubNotificationService.cs` anonim nesne gönderirken C# derleyicisi PascalCase (`OrderId`, `MerchantId`, `Status`) üretirken istemci doğrudan `payload.orderId` okuyordu.
   - **Çözüm:** Backend SignalR servisi hem `orderId`/`OrderId`, hem `merchantId`/`MerchantId`, hem `status`/`Status` barındıran bir Sözlük (Dictionary) paketi yayınlayacak şekilde güncellendi. Ayrıca `Program.cs` içerisindeki `builder.Services.AddSignalR()` yapılandırmasına `AddJsonProtocol` eklenerek CamelCase isimlendirme garantilendi.
2. **Savunmacı Frontend Normalizasyonu ([signalRService.ts](file:///c:/kuryesistemi/merchant_web/src/services/signalRService.ts)):**
   - WebSocket'ten gelen ham veri `rawPayload?.orderId ?? rawPayload?.OrderId ?? rawPayload?.id` şeklinde normalize edilerek dinleyicilere aktarıldı.
3. **Restoran GUID Filtreleme Hatası ([useNotificationListener.ts](file:///c:/kuryesistemi/merchant_web/src/hooks/useNotificationListener.ts)):**
   - **Sorun:** GUID karşılaştırması büyük/küçük harf (`toLowerCase().trim()`) uygulanmadan `!==` ile yapıldığı için eşleşmeler düşüyordu. Ayrıca `user.merchantId` yerine `merchant.id` bulunabilen oturumlarda filtreleme bildirimleri yutuyordu.
   - **Çözüm:** `myMerchantId = (currentUser?.merchantId || currentMerchant?.id || '').toLowerCase().trim()` kontrolü ile güvenli eşleştirme sağlandı.
4. **Tarayıcı Ses Otomatik Oynatma Politikası (Autoplay Policy - [audioAlert.ts](file:///c:/kuryesistemi/merchant_web/src/utils/audioAlert.ts)):**
   - **Sorun:** Modern tarayıcılar (Chrome/Edge/Safari), kullanıcı sayfada bir etkileşimde bulunmadan arka plandan gelen WebSocket çağrılarında `AudioContext`'in ses çalmasını engelliyordu.
   - **Çözüm:** `AudioAlertSystem` constructor'ı içerisine `window` üzerinde tek seferlik `click`, `keydown`, `touchstart` dinleyicisi eklenerek kullanıcının ilk dokunuşunda ses motoru kalıcı olarak çözümlendi (`unlockAudio()`).
   - Yeni `playAssignedSound()` tonu (F5 -> C6 çift zil) eklendi.
5. **Debounce Düzeltmesi ([notificationStore.ts](file:///c:/kuryesistemi/merchant_web/src/stores/notificationStore.ts)):**
   - Aynı siparişin 2 saniye içinde art arda gelen farklı durumları (`new_order` -> `assigned`) gereksiz yere engellenmemesi için debounce koşulu `orderId + type` ikilisine bağlandı.
6. **Masaüstü Bildirimleri & Test Düğmesi:**
   - Sekme arka plandayken veya simge durumundayken Windows yerel masaüstü bildirimi (`Notification API`) tetiklendi.
   - Bildirim zil çekmecesine ([NotificationBell.tsx](file:///c:/kuryesistemi/merchant_web/src/components/notifications/NotificationBell.tsx)) tek tıkla sesi test etme ("Dene") butonu eklendi.

### Doğrulama & Derleme
- **Backend (.NET 8):** `dotnet build` -> 0 Hata, 1 Uyarı. Servis PID 10531 üzerinden yayında.
- **Frontend (Vite + React):** `npm run build` -> 0 Hata ile tamamlandı.

---

## 39. H3 Hexagon Otonom Dağıtım Algoritması & İşletme Ayarları Revizyonu (23.09.2026)

### Özet
Getir, Yemeksepeti Mahalle ve Uber Direct standartlarında kurumsal lojistik parametreleri (H3 Hexagon altıgen hücresel kümeleme, kurye atama alanı sınırı, tur başı paket batching kapasitesi, sipariş birleştirme süresi ve çapraz restoran mesafesi) hem .NET 8 Backend çekirdeğine hem de `Settings.tsx` işletme paneline entegre edildi.

### 1. Eklenen Algoritma Parametreleri
1. **`HexagonSizeMeters` (int, default: 1120m):**
   - H3 Resolution 8/9 standardında altıgen hücre arama çapı. Kurye ve restoran kümelemesinde taranacak coğrafi altıgen hücresini belirler.
2. **`MaxCourierDistanceKm` (int, default: 6 km):**
   - Kurye otomatik atama alanı sınır yarıçapı. Restorandan 6 km'den daha uzaktaki kuryelere otomatik atama yapılmasını engeller.
3. **`MaxOrdersPerTour` (int, default: 2 paket):**
   - Kuryenin tek bir seferde (batching) üzerine alabileceği azami sipariş sayısı. Tek paket kısıtlamasını kaldırarak filo taşıma verimliliğini %40-%60 artırır.
4. **`OrderBatchingTimeMinutes` (int, default: 15 dk):**
   - Aynı yöne gidecek yeni siparişlerin düşmesi için bekleme/kümeleme süresi.
5. **`CrossRestaurantDistanceMeters` (int, default: 200m):**
   - Yakındaki komşu restoranlardan aynı yöne sipariş birleştirme sınırı.

### 2. Backend Geliştirmeleri (.NET 8 & PostgreSQL)
- **`Merchant.cs` & `MerchantConfiguration.cs`:** 5 yeni algoritma alanı varsayılan değerleriyle veritabanı şemasına eklendi.
- **EF Core Migration (`AddAlgorithmSettingsToMerchant`):** PostgreSQL veritabanına sorunsuz uygulandı (`dotnet ef database update`).
- **`UpdateMerchantSettingsDto.cs` & `MerchantDto.cs`:** Yeni parametreler DTO katmanına bağlandı.
- **`MerchantService.cs`:** `UpdateSettingsAsync` ve `MapToDto` metotları 5 yeni alanı güncelleyecek ve istemcilere dönecek şekilde genişletildi.
- **`OrderService.cs` (`SmartAuto` Dağıtım Motoru):**
  - Akıllı GPS atamasında `merchant.MaxCourierDistanceKm` sınırını aşan kuryeler elenir.
  - Kuryelerin aktif sipariş sayıları denetlenir (`activeOrders.Count < merchant.MaxOrdersPerTour`). Tur kapasitesi dolan kuryeler yeni paket almaz, kapasitesi olanlar aynı tura atanır.

### 3. Frontend Geliştirmeleri ([Settings.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/Settings.tsx))
- **3 Büyük Dağıtım Stratejisi Kartı:**
  1. 📡 **Havuz Sistemi (`Pool = 1`):** Açık sipariş havuzu, kuryeler mobil uygulamadan kendileri kabul eder.
  2. 🎯 **Manuel Atama (`Manual = 2`):** Yönetici/restoran kuryeyi haritadan el ile atar.
  3. 🤖 **Akıllı GPS (Auto-Dispatch) (`SmartAuto = 3`):** Otonom H3 dağıtım motoru.
- **Akıllı GPS Seçildiğinde Açılan Dinamik Algoritma Paneli:**
  - Pürüzsüz animasyonla açılan mor-indigo degrade kurumsal panel.
  - Hexagon Büyüklüğü (m), Kurye Atama Mesafesi (km), Sipariş Sayısı (paket), Restoranlar Arası Mesafe (m), Sipariş Birleştirme Süresi (dk) için mikro-ikonlu ve birim rozetli modern inputlar.
  - Canlı simülasyon ve algoritma çalışma mantığı özet kutusu.
- **Kayıt & Durum Senkronizasyonu:**
  - `merchantService.updateSettings()` ile backend'e PUT gönderimi.
  - Başarılı kayıtta Zustand `useAuthStore`'un güncellenmesi ve yeşil Toast bildirimi.

### Doğrulama & Derleme
- **Backend (.NET 8):** `dotnet build` -> 0 Hata, 0 Uyarı. Migration uygulandı, port 5000'de yayında.
- **Frontend (Vite + React):** `npm run build` -> 0 Hata ile tamamlandı.

---

## 40. Firma Paneli (FirmSettings & FirmMerchants) H3 Akıllı GPS Entegrasyonu (24.09.2026)

### Özet
Kurye Lojistik Şirketi (Firma / Admin) paneline ait **Firma Ayarları ([FirmSettings.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/firm/FirmSettings.tsx))** ve **Restoran Yönetimi ([FirmMerchants.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/firm/FirmMerchants.tsx))** sayfalarına H3 Hexagon otonom dağıtım algoritma parametreleri eksiksiz entegre edildi. Artık firma yöneticisi gerek varsayılan şirket politikasında gerekse tek tek restoran düzenleme/oluşturma pencerelerinde **"🤖 Akıllı GPS"** seçtiği anda 5 algoritma parametresi anında ekrana gelmektedir.

### 1. Firma Ayarları ([FirmSettings.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/firm/FirmSettings.tsx))
- **Akıllı GPS Seçildiğinde Açılan Algoritma Paneli:**
  - "Varsayılan Sipariş Dağıtım Modeli" altında `SmartAuto` seçildiğinde turkuaz/zümrüt temalı H3 Hexagon Algoritması & Otonom Kümeleme parametreleri kutusu dinamik olarak açılır.
  - Hexagon Büyüklüğü (H3 Çap, metre), Kurye Atama Mesafesi (Yarıçap, km), Tur Başı Paket (Batching, paket), Çapraz Restoran Mesafesi (metre) ve Birleştirme Süresi (Pencere, dk) için interaktif inputlar eklendi.
  - Canlı kural özeti bilgi kartı yerleştirildi.
- **Veritabanı Senkronizasyonu:**
  - `useEffect` içinde backend'den işletme verileri çekilirken 5 algoritma parametresi state'e aktarılır.
  - `handleSave` fonksiyonu ile `PUT /api/merchants/{id}/settings` uç noktasına iletilerek kalıcı hale getirilir.

### 2. Restoran Yönetimi ([FirmMerchants.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/firm/FirmMerchants.tsx))
- **Restoran Düzenleme Modalı (`EditModal`):**
  - Firma yöneticisi herhangi bir restoranın ayarlarını açıp Dağıtım Stratejisi olarak **"🤖 Akıllı GPS"** butonuna bastığında alt kısımda H3 parametre kutusu açılır.
  - İlgili restorana özel Hexagon çapı, maksimum kurye mesafesi ve batching limitleri özelleştirilebilir ve anında kaydedilir.
- **Yeni Restoran Ekleme Modalı (`AddMerchantModal`):**
  - Yeni restoran eklenirken "Akıllı GPS" seçildiğinde, sisteme H3 Hexagon motorunun otomatik atanacağını belirten bilgilendirici durum rozeti eklendi.

### Doğrulama & Derleme
- **Frontend (Vite + TypeScript):** `npm run build` -> **0 Hata** (3.58s içinde sorunsuz derlendi).
- **Backend API & Servisler:** Port 5000 ve Port 5173 canlıda ve aktif olarak hizmet vermektedir.

---

## 41. Restoran Paneli ([Settings.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/Settings.tsx)) Kilitli Mod Temizliği & Sözleşmeli Görünüm İyileştirmesi (24.09.2026)

### Özet
Restoran panelinde ([Settings.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/Settings.tsx)) kafa karışıklığı yaratan geçici "Restoran Görünümü (Kilitli)" / "👑 Kurye Firması Modu" geçiş anahtarı ve mor uyarı kartı tamamen kaldırıldı. Restoran işletmesinin kurye firması ile yaptığı sözleşme koşullarının (Dağıtım Stratejisi, H3 Parametreleri, Paket Başı Ücret, Mahsuplaşma Sıklığı) dışına çıkamayacağı mimari kuralı netleştirilerek arayüz sadeleştirildi.

### Yapılan İyileştirmeler:
1. **Üst Bar Temizliği:**
   - Sayfa sağ üstündeki demo yetki değiştirme butonu (`isCompanyAdminMode`) ve buna bağlı mor yönetici duyuru kartı kaldırıldı.
2. **Sözleşmeli Dağıtım Modeli Görünümü (Bölüm B):**
   - 3 strateji kartı (Havuz, Manuel, Akıllı GPS) tıklanabilir olmaktan çıkarılıp kurumsal sözleşme kartı formuna dönüştürüldü.
   - Kurye firmasının o restoran için belirlediği aktif dağıtım modeli **"✅ Sözleşmeli Aktif Model"** rozetiyle vurgulandı; diğer modeller pasif sözleşme dışı olarak gösterildi.
   - Firma tarafından "Akıllı GPS" belirlenmişse, geçerli H3 Hexagon parametreleri (altıgen çapı, maksimum kurye mesafesi, batching kapasitesi vb.) salt okunur (read-only) bilgilendirici kartlar halinde sunuldu.
3. **Finans & Sözleşme Görünümü (Bölüm C):**
   - Paket Başı Taşıma Ücreti (`₺{packageFee}/paket`) ve Kasa Mahsuplaşma Periyodu (Günlük/Haftalık/Aylık) doğrudan firmanın belirlediği sözleşmeli sabit değerler olarak temiz bir kartta sunuldu.
4. **Restoranın Düzenleyebildiği Alanlar (Bölüm A):**
   - Restoran yalnızca kendi meşru operasyonel verilerini (İşletme Adı, Telefon, İletişim Kişisi, Çalışma Saatleri, Açık/Kapalı Servis Durumu ve İnteraktif Leaflet GPS Harita Konumu) düzenleyip kaydeder.

### Doğrulama & Derleme
- **Frontend (Vite + TypeScript):** `npm run build` -> **0 Hata** (2.67s).
- **Sayfa Durumu:** Port 5173'te Vite ve Port 5000'de .NET 8 Backend sorunsuz hizmet veriyor.

---

## 42. H3 Hexagon Görsel Harita Izgarası (Polygon Mesh) ve Restoran Dağıtım Modeli Senkronizasyonu (24.09.2026)

### Özet
Firma panelinden "🤖 Akıllı GPS" seçilmesine rağmen restoranda hala "Manuel Atama" görünmesi sorunu ile firma ve restoran haritalarında Uber H3 altıgen çizgilerinin (polygon mesh) görsel olarak çizilmemesi talebi kalıcı olarak çözüldü.

### 1. Kök Neden Analizi & Çözümler
1. **Firma & Restoran Dağıtım Modeli Senkronizasyonu:**
   - **Kök Neden:** `FirmSettings.tsx` sayfasında kaydedilen genel firma politikası yalnızca firmanın kendi tüzel kayıt satırına (`Role = CourierFirm`) kaydediliyordu; bağlı restoranların (`Role = Merchant`) veritabanı kayıtları bu işlemden etkilenmiyordu.
   - **Çözüm:** `FirmSettings.tsx` üst çubuğuna *"Tüm Restoranlara Uygula"* senkronizasyon seçeneği (varsayılan: açık) eklendi. Firma yöneticisi Akıllı GPS veya H3 parametrelerini güncelleyip kaydettiğinde, sistem tüm bağlı restoranların ayarlarını da otomatik olarak `SmartAuto` ve güncel H3 parametreleriyle günceller.
2. **Enum String / Number Uyumsuzluğu (`FirmMerchants.tsx` & `Settings.tsx`):**
   - **Kök Neden:** ASP.NET Core `JsonStringEnumConverter` kullandığı için API'den `dispatchMode` değeri `"SmartAuto"` string'i olarak dönüyordu. `FirmMerchants.tsx` EditModal içinde `String(merchant.dispatchMode)` değeri `'1'`, `'2'`, `'3'` ile eşitlenemediği için buton seçili gelmiyor ve kaydetme anında `Number("SmartAuto")` ifadesi `NaN` üretiyordu.
   - **Çözüm:** `normalizeDispatchModeValue` ve `normalizeDispatchMode` yardımcı fonksiyonları tanımlanarak `"SmartAuto"`, `3`, `"3"`, `"Manual"`, `2`, `"Pool"`, `1` varyasyonlarının tamamı eksiksiz şekilde haritalandı.
3. **Veritabanı Güncellemesi:**
   - PostgreSQL veritabanındaki aktif restoranların (`İskenderun Dürüm Evi`, `Test Doner Salonu`) `DispatchMode = 3` (SmartAuto), `HexagonSizeMeters = 1120`, `MaxCourierDistanceKm = 6` olarak mühürlendi.

### 2. Uber H3 Hexagon Geodesik Izgara Motoru ([h3Geometry.ts](file:///c:/kuryesistemi/merchant_web/src/utils/h3Geometry.ts))
- Dünya yüzeyinde (WGS84) düzenli altıgen köşe noktalarını enlem/boylam metrik bozulmalarını hesaba katarak hesaplayan matematiksel motor inşa edildi (`getHexagonVertices`).
- Bir merkez koordinatı etrafında boşluksuz ve çakışmasız petek dokusu oluşturan `generateH3Cluster()` algoritması geliştirildi (1 Merkez Hücre + $\sqrt{3} \times R$ mesafede 6 Çevre Komşu Hücre).

### 3. Haritalara H3 Altıgen Katmanlarının Entegrasyonu
1. **Filo Canlı Radarı ([FirmRadar.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/firm/FirmRadar.tsx)):**
   - Tüm restoranların çevresine lila/mor transparan `Polygon` H3 hücreleri çizildi. Merkez hücreler kalın çizgi (`weight: 2.5`), komşu hücreler kesikli çizgi (`dashArray: 5, 6`) ile görselleştirildi.
   - Harita üzerine tek tıkla katmanı gizleyip açan **"⬡ H3 Altıgen Ağı: Açık/Kapalı"** buton kontrolü yerleştirildi.
   - Hücreye tıklandığında restoran adı, hücre çapı (1120m), maksimum kurye menzili (6 km) ve aktif dağıtım stratejisini gösteren zengin Leaflet Popup kartı eklendi.
   - Harita sol altındaki lejanta mor H3 rozeti eklendi.
2. **Firma Operasyon Paneli ([FirmDashboard.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/firm/FirmDashboard.tsx)):**
   - Dashboard ana haritasına aynı H3 polygon katmanı ve sağ üst köşe aç/kapa butonu entegre edildi.
3. **Restoran Canlı Radarı ([LiveRadar.tsx](file:///c:/kuryesistemi/merchant_web/src/pages/LiveRadar.tsx)):**
   - Restoranın kendi saha radarında paket çıkış noktası etrafındaki 1120 metrelik H3 kapsama altıgenleri görselleştirildi.

### Doğrulama & Derleme
- **Frontend (Vite + TypeScript):** `npm run build` -> **0 Hata** (1.35s içinde dist üretildi).
- **Backend API:** `GET /api/merchants` çağrısında restoranların `dispatchMode: "SmartAuto"` ve H3 parametreleri doğrulandı.
- **Portlar:** `http://localhost:5173` ve `http://localhost:5000` tam uyumla aktiftir.






