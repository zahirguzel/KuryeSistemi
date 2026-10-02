# KuryeSistemi Backend — Düzeltme Promptu

Aşağıdaki metni olduğu gibi Claude Code / Cursor / başka bir AI kod asistanına verebilirsin.

---

## GÖREV

Rol: Kıdemli .NET 8 backend mühendisisin. Çözüm: `C:\kuryesistemi\Backend\src` (KuryeSistemi.API / Application / Infrastructure / Domain, Clean Architecture, PostgreSQL + EF Core, Redis, Hangfire, SignalR, JWT).

Aşağıdaki sorunları **sırayla** düzelt. Her aşama sonunda `dotnet build` çalıştır, hata varsa düzelt, sonra sonraki aşamaya geç. API sözleşmesini (route, DTO alan adları, JSON yapısı) mobil/web istemciler kırılmasın diye **değiştirme**; gerekiyorsa yalnızca ekle. Yeni davranış getiren her değişikliği kısa bir not olarak raporla. Bilmediğin/emin olmadığın yerde varsayım yapma, soru sor.

Kurallar:
- Yetkilendirme kontrolleri controller'da değil, mümkünse **policy + servis katmanında sahiplik doğrulaması** ile yapılsın.
- Yetkisiz erişimde 403, kaynak başka tenant'a aitse 404 dön (varlığını sızdırma).
- Tüm para alanları `decimal`, tüm zamanlar UTC saklanır; "bugün" hesapları `Europe/Istanbul` saat dilimine göre yapılır.
- Her aşama için en az birim/entegrasyon testi ekle (xUnit). Özellikle yetki, mahsuplaşma ve eşzamanlılık testleri.

---

## AŞAMA 1 — Kritik güvenlik açıkları

### 1.1 Rol/yetki politikaları
- `AuthExtensions`: `AddAuthorization` içine politikalar ekle: `FirmOrAdmin` (CourierFirm, Admin), `MerchantOnly` (Merchant, CourierFirm, Admin), `CourierOnly` (Courier).
- Token `ClaimTypes.Role` taşıyor; `RoleClaimType` doğru eşlendiğinden emin ol.

### 1.2 MerchantsController
- `Create`, `Delete`, `GetAll` → yalnızca `FirmOrAdmin`.
- `GetById`, `UpdateSettings` → çağıran ya kendi `merchantId`'sidir ya da FirmOrAdmin. Aksi halde 403/404.
- `UpdateSettingsDto.Role` alanını **yalnızca Admin** değiştirebilsin; normal işletme gönderirse yok sayılsın veya 403 dönsün. Kimse kendi rolünü yükseltemesin.

### 1.3 CouriersController
- `Create`, `Update`, `Delete`, `{id}/shift`, `{id}/profile`, `{id}/earnings/*` → FirmOrAdmin **veya** kuryenin bağlı olduğu işletme. Kurye rolü yalnızca `me/*` endpoint'lerine erişebilsin.
- `Update` içinde `MerchantId` değişimi yalnızca FirmOrAdmin.
- **`GetAll` içindeki "kuryesi yoksa tüm kuryeleri döndür" fallback'ini sil.** Boş liste dön.
- `CreateCourierAsync`: çağıranın merchantId'si ile `request.MerchantId` tutarlılığını doğrula (FirmOrAdmin hariç).

### 1.4 OrdersController / OrderService
- `Create`: `request.MerchantId`, FirmOrAdmin değilse **her zaman token'daki merchantId** ile ezilsin.
- `Assign`: yalnızca siparişin işletmesi veya FirmOrAdmin; atanan kurye aynı işletmeye (veya firmaya) ait olmalı.
- `UpdateStatus`: kurye yalnızca **kendisine atanmış** siparişin durumunu ilerletebilsin (PickedUp, Delivered); işletme yalnızca kendi siparişini (Preparing/Ready/Cancelled) değiştirebilsin.
- `ClaimOrder`: yalnızca `CourierId == null` olan siparişler alınabilsin. `Assigned` durumundaki sipariş başka kurye tarafından çalınamasın.
- `GetActiveOrders(merchantId)`, `GetAll(merchantId)`: `ResolveTenantId` ile sahiplik zorunlu.

### 1.5 ReconciliationController
- `POST couriers/{id}` → yalnızca `MerchantOnly` (Courier rolü **asla** çağıramasın). Kuryenin bu işletmeye bağlı olduğunu doğrula.
- `GET merchant/summary`, `settlements` → `MerchantOnly`; firma dışı kullanıcı başka merchantId veremesin.

### 1.6 ProductsController
- `GetCategories` ve diğerleri `ResolveTenantId` kullansın.
- Request doğrulama ekle (FluentValidation): `Name`, `Category` zorunlu/maks uzunluk, `Price >= 0`, `DisplayOrder >= 0`. `request.Name.Trim()` NullReference vermesin.
- DTO/record'ları controller dosyasından `Application/DTOs/Products/` altına taşı. Mümkünse `ProductService` oluştur; controller doğrudan `IApplicationDbContext` kullanmasın.

### 1.7 LocationHub (SignalR)
- `SendLocationUpdate`: **yalnızca `Courier` rolü** çağırabilsin. `courierId` parametresi tamamen yok sayılsın, her zaman token'daki claim kullanılsın. Claim yoksa `HubException`.
- `latitude ∈ [-90, 90]`, `longitude ∈ [-180, 180]`, NaN/Infinity reddedilsin.
- `Clients.All` yerine: konum güncellemesini `merchant_{merchantId}` ve `firm_admin` gruplarına gönder. Aynı düzeltme `SignalRHubNotificationService.SendCourierStatusChangedAsync` ve `SendCourierLocationUpdatedAsync` için de yapılsın (kuryenin bağlı olduğu merchantId grubuna + firm_admin).
- Konum yayını sıklığı için basit bir throttle ekle (kurye başına en fazla ~1/sn).
- `Task.Run` ile fire-and-forget DB güncellemesi yerine: `Channel<T>` tabanlı bir `BackgroundService` kuyruğu veya Hangfire kullan; hatalar loglansın.

### 1.8 Sırlar ve loglama
- `appsettings.json` içindeki **DB şifresi ve JWT SecretKey** kaldırılsın; `dotnet user-secrets` (dev) ve ortam değişkeni (prod) ile okunsun. `appsettings.json`'da yer tutucu bırak. Başlangıçta `SecretKey` boşsa veya 32 karakterden kısaysa uygulama başlamasın (fail-fast).
- `LoggingBehavior`: `{@Request}` ile **şifre/token loglamayı durdur**. Komutlarda hassas alanları `[SensitiveData]` benzeri bir attribute ile işaretle ve Serilog destructuring policy ile maskele (veya yalnızca request adı + id'leri logla). Mevcut `logs/` klasörü git'e girmesin (`.gitignore`) ve içindeki eski loglar silinsin.
- `Serilog` loglarında `Authorization` header'ı ve `access_token` query parametresi loglanmasın (`UseSerilogRequestLogging` enrich filtresi).

### 1.9 Kimlik doğrulama sertleştirme
- `AuthService`: `PasswordHash` boş olan kuryenin **ilk girilen şifreyi kabul etme** davranışını kaldır. Bu hesaplar giriş yapamasın; firma "şifre sıfırla" ile geçici şifre atasın (aşağıya bak).
- `CreateCourierAsync`: varsayılan `"sifre123"` yerine kriptografik rastgele geçici şifre üret, yalnızca yaratma yanıtında bir kez göster (veya SMS/e-posta servisi ile gönder) ve `MustChangePassword` bayrağı ekle (migration).
- `PasswordHasherService.VerifyPassword`: düz metin (`password == passwordHash`) fallback'ini kaldır. Önce tüm kayıtları migration ile BCrypt'e çevirecek tek seferlik bir script/komut yaz, sonra fallback'i sil. Karşılaştırmayı en azından `CryptographicOperations.FixedTimeEquals` ile yap.
- Login'de merchant bulunup şifre yanlışsa kurye tablosuna bakılmıyor, bu doğru; ancak e-posta var/yok bilgisini **yanıt süresi farkıyla** sızdırmamak için kullanıcı bulunamadığında da sahte bir BCrypt doğrulaması yap (timing eşitleme).
- `ChangePasswordRequestDto` için minimum şifre politikası: en az 8 karakter, harf+rakam. Şifre değişince eski token'lar geçersiz olsun (kullanıcıya `TokenVersion` claim'i ekleyip doğrulamada kontrol et).
- Login rate limiter: global sayaç yerine `PartitionedRateLimiter` ile **IP + e-posta** bazlı bölümle. 429 yanıtında `Retry-After` döndür. Ek olarak başarısız deneme sayacı ile geçici hesap kilidi (örn. 5 hata → 15 dk).
- JWT: ömrü 24 saatten 15–60 dakikaya düşür; refresh token (DB'de hash'li saklanan, döndürülen/rotating) ekle ve `POST /api/Auth/refresh`, `POST /api/Auth/logout` yaz. `OnAuthenticationFailed` loglarını `Debug` seviyesine çek (expired token spam'i).
- `RequireHttpsMetadata = false` yalnızca Development'ta olsun.
- CORS: `Cors:AllowedOrigins` boşsa production'da **başlatmayı reddet** veya hiç origin'e izin verme. `SetIsOriginAllowed(_ => true)` + `AllowCredentials` kombinasyonu yalnızca Development'ta kalsın.
- `AllowedHosts` production'da gerçek host adlarıyla kısıtlansın.
- Hangfire Dashboard: tarayıcı `Authorization` header'ı göndermediği için prod'da çalışmıyor. Cookie tabanlı küçük bir giriş veya yalnızca localhost/IP allowlist + basic auth ile koru. Development'ta bile `Authorization = true` yerine en azından localhost kısıtı olsun.
- `GlobalExceptionMiddleware`: `InvalidOperationException` ve `DbUpdateException` için uygun durum kodları; 500'de iç hata mesajı dönme. `GlobalExceptionHandler` kullanılmıyor, **birini sil** (middleware kalsın veya `AddExceptionHandler` ile tek yapı).
- Güvenlik başlıkları (`X-Content-Type-Options`, `X-Frame-Options`, HSTS) ve istek gövdesi boyut limiti ekle.

---

## AŞAMA 2 — Veri bütünlüğü ve eşzamanlılık

### 2.1 Optimistic concurrency
- `Order` ve `Courier` entity'lerine PostgreSQL `xmin` tabanlı concurrency token ekle (`builder.Property<uint>("xmin").IsRowVersion()` veya `UseXminAsConcurrencyToken`). Migration üret.
- `AssignOrderAsync`, `ClaimOrderAsync`, `TrySmartAutoAssignAsync`, `UpdateStatusAsync`, `ReconcileCourierAsync`: `DbUpdateConcurrencyException` yakalansın, 409 Conflict dönsün veya kısa retry yapılsın.
- Alternatif/ek: sipariş atamayı tek bir koşullu SQL ile yap (`UPDATE ... WHERE Id=@id AND CourierId IS NULL`) ve etkilenen satır sayısına bak.

### 2.2 Mahsuplaşma düzeltmeleri
- `ReconcileCourierAsync`: teslim edilmiş sipariş istatistiklerini **kuryenin son mahsuplaşmasından (`CashSettlement.SettledAt` max) sonraki** siparişlerle sınırla. İdeal çözüm: siparişlere `SettlementId` (nullable FK) ekleyip mahsuplaşmada bu siparişleri o kayda bağla. Böylece kümülatif/yanlış toplam sorunu kalmaz.
- İşlem, bakiye okuma → sıfırlama → settlement kaydı → audit log tek `IDbContextTransaction` içinde olsun; `courier.CurrentBalance` concurrency korumalı olsun.
- Çift mahsuplaşmaya karşı idempotency: aynı kurye için aynı anda ikinci istek 409 dönsün.
- `// Sipariş bulunamayıp bakiye manuel girilmişse bakiyeden türet` bloğundaki tahmin mantığını kaldır; veri yoksa 0 yaz ve notla belirt.
- Finans özetinde `totalFirmDeliveryFee = adet × güncel DefaultPackageFee` tarihsel olarak yanlış: `Order`'a `PackageFee` (decimal) alanı ekle, sipariş oluşturulurken mühürle, özet hesabı bu alandan yapılsın (migration + eski kayıtlar için backfill).

### 2.3 Sipariş akışı mantık hataları
- `UpdateStatusAsync`, `Pending → PickedUp/Assigned` geçişinde `courierId` yoksa **işletmenin ilk kuryesini rastgele atıyor**: kaldır. Kurye belirtilmemişse 400 dön.
- `Delivered` ve `FreeCourierAsync`: kuryenin **başka aktif siparişi varsa** `IsAvailable = true` yapma. Aktif sipariş sayısını kontrol edip `IsAvailable = (aktifSayi < MaxOrdersPerTour)` olarak ayarla.
- `Delivered` içinde `CourierEarning` her seferinde yeniden hesaplanıyor: sipariş oluşturulurken mühürlenen değeri koru, teslimde ezme. Bakiye güncellemesi yalnızca `Delivered`'a ilk geçişte yapılsın (idempotent).
- `Cancelled` durumunda nakit/bakiye tersine çevirme gerekiyorsa tanımla (sipariş `PickedUp` iken iptal edilirse tahsilat durumu).
- `AllowedTransitions` tablosu çok gevşek (`Ready → Delivered`, `Assigned → Delivered`, `Delivered`'dan geri dönüş yok ama `PickedUp → Assigned` var). İş kurallarını netleştirip sıkılaştır ve her geçişin hangi rol tarafından yapılabileceğini ekle.
- `OrderTimeoutJob`: yalnızca `Pending` siparişleri iptal ediyor; `Preparing/Ready` ve kurye atanmamış siparişler de dikkate alınsın (iş kuralına göre). Job, `ISender` ile **MediatR `UpdateOrderStatusCommand`** çağırıyor; bu handler `OrderService.UpdateStatusAsync` ile aynı mantığı içermeyebilir (bakiye, kurye serbest bırakma). Job'u doğrudan `IOrderService.UpdateStatusAsync` kullanacak şekilde değiştir.
- `ScheduleUnassignedOrderCheck` Hangfire job'u: sipariş atandığında/iptal edildiğinde job iptal edilsin veya job kendi içinde durumu zaten kontrol ediyor (doğru), ama aynı sipariş için job'un çift tetiklenmemesini sağla.

### 2.4 SmartAuto atama
- GPS konumu olmayan kurye için mesafeyi `0` almak onu "en yakın" yapıyor: GPS'siz kuryeleri aday listesinden çıkar veya `double.MaxValue` ile en sona at.
- Aday kurye bulunamazsa **başka işletmelerin kuryelerine** geri düşme (`GetAllAsync(c => c.IsOnline)`) kaldırılsın. Firma (CourierFirm) modeli varsa yalnızca o firmaya bağlı kuryeler.
- Aday kuryelerin `IsAvailable` ve `LastLocationUpdate` tazeliği kontrol edilsin (örn. 5 dk'dan eski konum güvenilmez).
- Aktif sipariş sayımı ve atama aynı transaction/concurrency koruması içinde olsun (2.1).

### 2.5 Kurye konum/mesai
- `CourierService.UpdateLocationAsync`: her çağrıda `IsOnline = true` yapmasın. Mesaisini bitirmiş (`IsOnline=false`) kuryenin konum güncellemesi online yapmasın, yalnızca konumu yazsın veya reddetsin.
- `ToggleShiftAsync(false)`: kuryenin aktif siparişi varsa mesai kapatmaya izin verme veya siparişleri havuza geri al.
- `CourierPresenceJob` (60 dk eşiği) ile Program.cs'teki başlangıç temizliği (12 saat) eşiklerini `appsettings` üzerinden tek yerden yönet. Yorumlarda "son 5 dakika" yazıyor, kodda 60 dk: tutarsızlığı gider.
- Konum güncellemelerinde `SaveChanges` çok sık çalışıyor: DB yazımlarını örnekle (örn. kurye başına 10 sn'de bir) veya Redis'te tut.

### 2.6 Benzersizlik ve doğrulama
- `Courier.Email`, `Merchant.Email` için **unique index** (case-insensitive: `lower(Email)` veya `citext`) ve `CreateCourierAsync`/`UpdateCourierAsync` içinde e-posta çakışma kontrolü.
- Unique index'ler soft-delete'i hesaba katsın: `HasFilter("\"IsDeleted\" = false")`. Mevcut `IsPlateOrPhoneExistsAsync` silinmiş kayıtlarla çakışmasın.
- `Order.OrderCode`: `Random.Shared.Next(1000, 9999)` yerine merchant başına ardışık sayaç veya `Guid` tabanlı kısa kod; `(MerchantId, OrderCode)` unique index.
- `CreateOrderAsync`: `Online` ödemede de `TotalOrderAmount >= 0`; telefon formatı, koordinat aralığı (`DeliveryLatitude/Longitude`), maks. uzunluklar doğrulansın. `CreateOrderRequestDtoValidator` ve `Features/.../CreateOrderCommandValidator` ikisi var; hangisinin çalıştığını netleştir, **tek** doğrulama kaynağı bırak (controller'da otomatik FluentValidation).
- Sabit kodlanmış değerleri kaldır: `"İskenderun"`, `"Hatay"`, `"İskenderun Dürüm Evi"`, `40.00m`, `EstimatedDeliveryMinutes = 25`, `36.5867/36.1714` varsayılan koordinatları. Bunları işletme ayarlarından/yapılandırmadan oku; yoksa 400 dön.
- `MapToDto` içinde `order.Merchant is not null ? ... : "İskenderun Dürüm Evi"` fallback'ini kaldır.
- Boolean alanlarda `HasDefaultValue(true/false)` (Courier.IsAvailable, Merchant.IsActive/IsOpen) EF uyarısına yol açıyor ve `false` değerleri ezilebiliyor: `HasDefaultValue` kaldır veya sentinel değer tanımla; loglardaki `DispatchMode`/`ReconciliationPeriod` "sentinel" uyarılarını da gider.

### 2.7 Saat dilimi
- `DateTime.UtcNow.Date` kullanılan tüm "bugün" hesaplarını (`GetMerchantTodayOrdersAsync`, `GetDeliveredOrdersByCourierAndDateAsync`, `GetTodayEarningsAsync`, `GetProfileAsync`) `Europe/Istanbul` gün başlangıcı/bitişine çevir (UTC'ye dönüştürerek sorgula). Bir `IClock`/`IDateTimeProvider` soyutlaması ekle ve testlerde kullan.
- Tarih aralığı filtrelerinde (`startDate/endDate`) `DateTimeKind.Utc` zorlaması yerine gelen değeri İstanbul saati kabul edip UTC'ye çevir; `endDate` gün sonunu kapsasın (şu an `<=` ile gün başı).

---

## AŞAMA 3 — Mimari tutarlılık ve altyapı

### 3.1 Çift mimari (Service + MediatR Feature) sorunu
Projede iki paralel uygulama var: controller'lar `IOrderService/ICourierService/IMerchantService/IAuthService` kullanıyor; `Application/Features/**` altındaki MediatR command/query handler'ları ise (CreateOrder, AssignOrder, UpdateOrderStatus, CreateCourier, LoginMerchant, GetAllMerchants vb.) controller'lardan **çağrılmıyor** (yalnızca `OrderTimeoutJob` bir tanesini kullanıyor). Aynı iş mantığı iki yerde yaşıyor ve birbirinden ayrışıyor (ör. `LoginMerchantCommandHandler` vs `AuthService.LoginAsync`).
- Tek bir yaklaşım seç ve diğerini kaldır. Önerilen: **Service katmanını koru**, kullanılmayan `Features/**` handler/command/query/validator/DTO'larını sil (önce referans taraması yap), `OrderTimeoutJob`'u servise taşı.
- MediatR gerçekten kullanılmayacaksa paketi, `LoggingBehavior`, `CachingBehavior`, `CacheInvalidationBehavior`, `ValidationBehavior` ve `ApplicationServiceRegistration` MediatR bölümünü kaldır. FluentValidation'ı controller seviyesinde otomatik doğrulama (`AddFluentValidationAutoValidation`) veya servis girişinde çağır.
- Aynı konuda DTO çoğalması: `Application/DTOs/**` ve `Application/Features/**/DTOs` altında `CourierDto`, `MerchantDto`, `OrderDto`, `AuthTokenDto` ayrı yerlerde. Tek konuma topla, namespace'leri sadeleştir.
- Loglarda görülen `LoginRequest`, `CreateOrderRequest`, `LoginMerchantCommand` gibi eski tip adları, kodun eski sürümlerinden: güncel kodla uyumsuz eski bir derleme çalışıyor olabilir. Temiz derleme (`dotnet clean` + `build`) yap.

### 3.2 Katman bağımlılıkları
- `IApplicationDbContext` içinde `DbSet<>` ve `Microsoft.EntityFrameworkCore` kullanıldığı için Application katmanı fiilen EF Core'a bağımlı (yorum "DIP" diyor ama değil). İki seçenek: (a) bilinçli kabul et ve yorumu düzelt, (b) `IQueryable<T>` döndüren okuma arayüzleri + repository'ler ile gerçek soyutlama yap. En azından servisler arasında tutarlılık sağla: şu an `MerchantService` hem repository hem doğrudan `_db` kullanıyor, `ProductsController` doğrudan `_db`.
- `OrderService.GetAllAsync(predicate)` gibi tüm tabloyu belleğe çeken kullanımlar (`TrySmartAutoAssignAsync`, `GetProfileAsync` içinde `allDelivered`) yerine `CountAsync`/projeksiyon kullan.
- `CourierRepository.GetAllAsync()` ve `GetAllOrdersAsync` için **sayfalama** (`page`, `pageSize` maks 100) ekle; `GetAll` endpoint'leri sınırsız liste döndürmesin.
- `ServiceExtensions` içindeki parametresiz `AddApplicationServices(this IServiceCollection)` aşırı yüklemesini **sil** (`IPasswordHasherService`/`IAuditService`'i kaydetmiyor, `BuildServiceProvider()` anti-pattern, DI doğrulama hatasına yol açmıştı).
- `SaveChangesAsync` birden çok kez çağrılıyor (`FreeCourierAsync` kendi içinde kaydediyor, ardından çağıran tekrar kaydediyor): bir iş akışı = tek transaction/Unit of Work olacak şekilde düzenle.
- `AppDbContext`: `UpdatedBy` alanları "system" olarak sabit yazılıyor; gerçek kullanıcı kimliğini `ICurrentUser` (HttpContext) üzerinden otomatik doldur. `CreatedBy = "system"` sabitlerini kaldır.
- Hangfire, `HttpContext`'siz çalışır: job içindeki servislerin `ICurrentUser`'a bağımlı olmadığından emin ol.

### 3.3 Veritabanı ve başlangıç
- Loglardaki `column m.DefaultPackageFee does not exist` ve `column m.IsOpen does not exist` hataları uygulanmamış migration'dan geliyor. Development'ta açılışta `Database.MigrateAsync()` (veya CI/CD'de `dotnet ef database update`) ile migration'ları uygula; production için migration bundle kullan. Mevcut migration zincirini ve `AppDbContextModelSnapshot`'ı tutarlılık için kontrol et (`dotnet ef migrations has-pending-model-changes`).
- Açılışta DB erişilemezse uygulama çökmesin: Hangfire/`RecurringJob.AddOrUpdate` ve başlangıç temizliği, DB hazır olana kadar retry/health-check ile sarılsın. `/health` endpoint'i (PostgreSQL + Redis) ekle.
- Redis erişilemezse API çökmesin; `CachingBehavior` kaldırılacaksa Redis bağımlılığı da gereksizse kaldır.
- Program.cs'teki startup temizliği: `DateTime.UtcNow.AddHours(-12)` yorumda "dünden kalan"; açıkça yapılandırılabilir yap ve ayrı bir `IHostedService`'e taşı. `Program.cs`'te iş mantığı olmasın.
- `launchSettings`: port 5000 çakışması (`address already in use`) loglarda görülüyor. Çalışan eski instance'ı kapatma notu ekle ve `ASPNETCORE_URLS` ile yapılandırılabilir yap.
- `Courier`/`Order` tablolarında sorgu performansı için indeksler: `Orders(CourierId, Status)`, `Orders(Status, CourierId) WHERE CourierId IS NULL`, `Couriers(IsOnline, MerchantId)`, `Orders(DeliveredAt)`. `Courier.Email`, `Merchant.Email` unique (2.6).
- Silinen (`IsDeleted`) kayıtların Include ile gelen ilişkilerde (örn. `Courier` silinmiş sipariş) null dönme durumlarını ele al.

### 3.4 Gözlemlenebilirlik ve operasyon
- Her istekte `X-Correlation-Id`; Serilog `LogContext`'e `UserId`, `MerchantId`, `CorrelationId` ekle.
- `logs/` klasörü `.gitignore`'da olsun; log dosyası saklama süresi ve toplam boyut limiti belirle.
- Swagger yalnızca Development'ta (şu an böyle, koru) ve JWT şeması ile.
- Production için `RealSmsService/RealEmailService/RealPushNotificationService` uygulamalarını incele: gerçek sağlayıcı çağrıları yoksa `NotImplementedException` fırlatıp isteği düşürmesin; hata durumunda siparişi bozmadan loglayıp devam etsin (Hangfire retry ile gönder).

---

## AŞAMA 4 — Testler ve teslim

- `KuryeSistemi.Tests` projesi (xUnit + FluentAssertions + `Testcontainers.PostgreSql` veya EF InMemory/SQLite uyarılarıyla birlikte; concurrency testleri için gerçek PostgreSQL tercih et).
- Zorunlu test senaryoları:
  1. Merchant, başka merchant'ın sipariş/kurye/ürün/finans verisine erişemez (404/403).
  2. Merchant kendi `Role` alanını `Admin` yapamaz.
  3. Kurye `Reconciliation` endpoint'ini çağıramaz; başka kuryenin siparişini `UpdateStatus` ile değiştiremez.
  4. İki kurye aynı anda aynı siparişi `Claim` ederse yalnızca biri başarılı olur.
  5. Mahsuplaşma, yalnızca son mahsuplaşmadan sonraki teslimatları toplar; ikinci ardışık çağrı 400/409 döner; bakiye 0 olur.
  6. `Delivered` iki kez çağrılırsa bakiye bir kez güncellenir.
  7. Kuryenin başka aktif siparişi varken teslimat sonrası `IsAvailable` doğru hesaplanır.
  8. SmartAuto: GPS'siz kurye en yakın seçilmez; farklı işletmenin kuryesi atanmaz.
  9. Login rate limit IP+e-posta bazlıdır; yanlış şifre hesabı kilitler; düz metin şifre artık kabul edilmez.
  10. SignalR: kurye olmayan token konum yayınlayamaz; başka kurye ID'si taklit edilemez; yayın yalnızca ilgili gruplara gider.
  11. İstanbul saatiyle gece 00:30'da verilen teslimat "bugün" raporunda görünür.
  12. Çakışan e-posta/plaka/telefon 409 döner (silinmiş kayıtlar hariç).
- Tüm yeni migration'ları ayrı ve geri alınabilir yaz; veri kaybı riski olanları (backfill) raporla.
- İş bittiğinde: `dotnet build -warnaserror` (mümkünse), `dotnet test`, ve `dotnet ef migrations list` çıktısını ver. Değişen dosyaların listesini, yeni/değişen endpoint davranışlarını ve geriye dönük uyumsuzluk riskini madde madde raporla.

---

## ÇIKTI FORMATI

Her aşama için: (1) yapılan değişikliklerin kısa özeti, (2) değişen dosyalar, (3) eklenen testler ve sonuçları, (4) istemcileri (mobil/web) etkileyebilecek davranış değişiklikleri. Aşamayı bitirmeden bir sonrakine geçme.
