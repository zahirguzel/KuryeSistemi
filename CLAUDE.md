# KuryeSistemi — Claude Code Proje Rehberi

Çok kiracılı (multi-tenant) kurye lojistik platformu. Yanıtlar ve kod yorumları **Türkçe**.
Loji (kurye firması yönetim paneli) referans alınarak sayfa sayfa geliştiriliyor; referans dosyalar `docs/loji-reference/`.

## Yığın
- `Backend/` — .NET 8 Web API, EF Core + PostgreSQL, Redis, SignalR, Hangfire (src/KuryeSistemi.{API,Application,Domain,Infrastructure}, tests/KuryeSistemi.Tests)
- `merchant_web/` — React 19 + Vite + TypeScript (restoran paneli + `src/pages/firm/*` kurye firması paneli)
- `kurye_mobil/` — Flutter + Riverpod (kurye uygulaması)
- Altyapı: `docker-compose.yml` (Postgres/PostGIS + Redis). Şifre `.env` içindeki `DB_PASSWORD` (varsayılan geliştirme değeri var).

## Komutlar (bitirmeden ÖNCE hepsi çalıştırılmalı)
- Backend: `cd Backend && dotnet build && dotnet test`
- Web: `cd merchant_web && npm run build`
- Mobil: `cd kurye_mobil && flutter analyze`
- API geliştirme ortamı: `dotnet run --project Backend/src/KuryeSistemi.API` (Development; gerçek sırlar gitignore'lu `appsettings.Development.json` içinde; `appsettings.json` yalnızca yer tutucu içerir)

## Hiyerarşi ve kiracı izolasyonu
SuperAdmin > CourierCompany (kurye firması) > Merchant (restoran) > Courier.
- **Kurye doğrudan firmaya bağlıdır:** `Courier.CourierCompanyId` zorunlu. `Courier.MerchantId` **isteğe bağlı**:
  `null` = ortak filo (firmanın tüm restoranlarına hizmet verir); dolu = yalnızca o restoranın siparişlerini alır.
  Firmanın kendi hesabı (`Role = "CourierFirm"` işletme kaydı) seçilirse bu "ortak filo" anlamına gelir (MerchantId = null).
- `Merchant.CourierCompanyId` (nullable) restoranın firmasıdır. **Eski uyum kuralı:** `CourierCompanyId == null` olan restoran tüm firmalara açıktır; bağlanınca yalnızca kendi firmasına + SuperAdmin'e. `Backend/scripts/sql/backfill_company_links.sql` bunu bitirir.
- Erişim kontrolü `BaseController` içinde: `CanAccessMerchantAsync`, `GetAccessibleMerchantIdsAsync`, `HasCompanyPermissionAsync`. Yeni endpoint yazarken **mutlaka** uygula.
- CompanyUser yetki matrisi (`CompanyPermission`): ViewReports, ManageFinance, ManageCouriers, ManageOrders, ManageMerchants, EditCompanySettings. Rol varsayılanları: Manager hepsi; Accountant rapor+finans; Operator kurye+sipariş; Support yalnızca sipariş. Yazma endpoint'lerinde (kurye/sipariş/restoran/finans) kontrol var, okuma serbest.
- JWT claim'leri: Merchant/Courier → `merchantId`, `courierId`, `courierCompanyId`; CompanyUser → `companyUserId`, `courierCompanyId`, rol `CompanyUser_*`; Admin → `adminUserId`, rol `SuperAdmin`. Ortak filo kuryesinin `merchantId` claim'i boş Guid'dir (SignalR'da gruba eklenmez).

## Mimari kararlar
- **Tek akış: Controller → Service (`Services/Concrete`).** CQRS/MediatR katmanı kaldırıldı; tekrar ekleme.
- Doğrulama: FluentValidation validator'ları `Application/Validators/`; `API/Filters/ValidationFilter.cs` global çalışır ve hatayı `ServiceResult` formatında (400) döner. Yeni create/update DTO'su → validator ekle.
- Tüm API yanıtları `ServiceResult<T>` (`isSuccess, message, statusCode, errors`). İstemciler bunu bekler.
- `Features/*/DTOs` klasörleri canlı kullanılıyor (silme/taşıma ayrı iş).
- Testler servisleri doğrudan oluşturur (Moq): **servis constructor imzalarını koru** (OrderService, CourierService, MerchantService, SignalRHubNotificationService).
- Şema: temel tablolar EF migration'larıyla, firma tabloları önce elle SQL (`Backend/scripts/sql/create_multi_tenant_tables.sql`) sonra `AddMultiTenantCourierCompany` migration'ıyla. Sıfır DB'de SuperAdmin tohumu yalnızca SQL dosyasındadır. Üretimde varsayılan admin şifresini değiştir.

## Sipariş ve dağıtım
- Durum makinesi `OrderService.AllowedTransitions`. Kurye yalnızca PickedUp/Delivered yapabilir.
- Teslimde `CourierEarning` / `FirmFee` o anki restoran ücretlerinden **sipariş bazında mühürlenir**; nakitte kurye bakiyesi = −TotalOrderAmount + CourierEarning. Mahsuplaşma sipariş bazında toplar.
- Dağıtım modları: Pool=1, Manual=2, SmartAuto=3. Restoran bu ayarları **değiştiremez** (API'de yok sayılır, arayüzde kilitli); yalnızca firma/SuperAdmin.
- **SmartAuto** (`OrderService.TrySmartAutoAssign*`): aday = online kurye; restoranın firması içinde `MerchantId == null` veya `== restoran`; aktif sipariş < `MaxOrdersPerTour`; GPS varsa mesafe ≤ `MaxCourierDistanceKm`. Konumu 2 dk'dan eski/yok kurye "GPS'siz" (999 km). Sıra: birleştirilebilen → en yakın → en az yüklü. Firma bazlı SemaphoreSlim kilidi (eşzamanlı atama).
- **Birleştirme (`CanBundle`)**: mevcut sipariş `Assigned` ve `OrderBatchingTimeMinutes` içinde; farklı restoranda alım noktaları ≤ `CrossRestaurantDistanceMeters`; teslimatlar aynı mahalle veya ≤ `HexagonSizeMeters`. (Backend gerçek H3 kullanmaz, mesafe tabanlı; LiveRadar petek çözünürlüğü `hexSizeToH3Resolution` ile ayardan türetilir.)
- `SmartAutoRetryJob` dakikada bir atamasız SmartAuto siparişleri yeniden dener. `OrderTimeoutJob` 15 dk atanmayanı iptal eder. `CourierPresenceJob` aktif siparişi olmayan sinyalsiz kuryeyi offline yapar.
- SignalR hub `/hubs/location`; gruplar `merchant_{id}`, `company_{id}`, `firm_admin` (eski/bağsız), `superadmin`, `courier_{id}`, `courier_pool_{companyId}` (veya eski `courier_pool`).
- Hangfire paneli: Development açık; üretimde `Hangfire__DashboardUser/Password` ile Basic auth veya SuperAdmin.

## Güvenlik kuralları
- Üretimde varsayılan JWT anahtarı / DB şifresiyle uygulama başlamaz (`AuthExtensions`, `Program.cs`). Sırları ortam değişkeniyle ver: `JwtSettings__SecretKey`, `ConnectionStrings__DefaultConnection`, `AllowedHosts`.
- CORS: `Cors:AllowedOrigins` boşsa üretimde yalnızca localhost:5173.

## Dosya yerleşimi
- `docs/loji-reference/` Loji video/kareler/transkript/proje dokümantasyonu; `docs/prompts/` eski prompt'lar; `Backend/scripts/sql/` tek seferlik SQL'ler; `Backend/scripts/dev/` örnek istekler.

## Açık / planlanan işler
1. **Ek paket hakedişi:** restoran ücreti sabit; aynı turdaki 2. ve sonraki paketlerde kurye hakedişi ayrı (restoran başına `AdditionalPackageCourierCut`), firmaya daha çok kalır. Tur için `TourId`/`TourSequence`. Karar bekleyen: 1. paket iptal olursa 2. paket "ilk paket" gibi ücretlendirilir (önerilen).
2. Eksik Loji sayfaları: 11+ rapor sayfası, alt ekipler, havuz/bölge ayarları, sipariş alt sekmeleri (ortak bileşen gösteriyor). Kullanıcı ekran görüntüsü gönderdikçe sırayla yapılacak.
3. `FirmOrders` sayfalaması, finans özeti saat dilimi testleri, CompanyUser yetkilerinin okuma uçlarına genişletilmesi.
4. `LoginRequestDtoValidator` giriş için min şifre uzunluğu kontrolü (6) içeriyor; kaldırılması düşünülüyor (eski hesaplar kilitlenmesin).

## Çalışma kuralları
- Önce kodu oku, sonra değiştir; kapsamı küçük tut. Derlemeyi ve testleri çalıştırmadan "bitti" deme; bulduğun sorunları ve yapmadıklarını açıkça raporla.
- Yeni özellikte: kiracı erişim kontrolü, yetki kontrolü, validator ve (para/dağıtım mantığında) birim test ekle.
- Commit/push yalnızca istenirse. Gizli bilgi commit'leme.
