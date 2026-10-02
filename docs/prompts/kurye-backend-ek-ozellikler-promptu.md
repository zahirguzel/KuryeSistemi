# KuryeSistemi Backend — Profesyonelleştirme ve Ek Özellikler Promptu

> **Ön koşul:** Önce `kurye-backend-duzeltme-promptu.md` (Aşama 1–4) tamamlanmış olmalı. Bu prompt onun üzerine inşa edilir; aynı konuyla çakışan bir madde varsa düzeltme promptundaki sürüm geçerlidir. Bu dosyayı da aşama aşama ver.

---

## GÖREV

Rol: Kıdemli .NET 8 mimarı + backend mühendisisin. Çözüm: `C:\kuryesistemi\Backend\src` (Clean Architecture; API / Application / Infrastructure / Domain; PostgreSQL, Redis, Hangfire, SignalR, JWT).

Hedef: Sistemi "çalışıyor" seviyesinden **üretime hazır, bakımı kolay, denetlenebilir ve ölçeklenebilir** seviyeye çıkarmak.

Çalışma kuralları:
- Her aşamanın sonunda `dotnet build`, `dotnet test` çalıştır; yeşil olmadan sonraki aşamaya geçme.
- Mevcut API sözleşmesini (route, JSON alan adları) kırma. Kırıcı değişiklik gerekiyorsa `/api/v2` altında yap ve v1'i koru.
- Her yeni özellik: (1) migration, (2) servis + doğrulama, (3) controller, (4) test, (5) Swagger dokümantasyonu ile birlikte teslim edilir.
- Emin olmadığın yerde varsayım yapma, soru sor. Yaptığın her mimari kararı `docs/adr/NNNN-baslik.md` dosyasına (ADR) kısaca yaz.
- Kullanıcıya dönük metinleri (hata mesajları) koda gömme; `Resources` / sabit sınıfları kullan (bkz. Aşama 2).

---

## AŞAMA 1 — Proje iskeleti, ortam ve CI/CD

### 1.1 Depo hijyeni
- Kök dizine `.gitignore` (dotnet şablonu + `logs/`, `*.user`, `appsettings.*.local.json`, `.vs/`, `bin/`, `obj/`) ekle. `KuryeSistemi.API.csproj.user` ve `logs/` dosyalarını izlemeden çıkar.
- `README.md`: projenin amacı, mimari diyagramı (Mermaid), gereksinimler, tek komutla kurulum, ortam değişkenleri tablosu, test çalıştırma, migration komutları.
- `CONTRIBUTING.md`: branch stratejisi (trunk-based veya GitFlow-lite), commit mesajı standardı (Conventional Commits), PR kontrol listesi.
- `.editorconfig`, `Directory.Build.props` (ortak `TargetFramework`, `Nullable=enable`, `ImplicitUsings`, `TreatWarningsAsErrors=true`, `AnalysisLevel=latest-recommended`), `Directory.Packages.props` (merkezi paket sürümleri).

### 1.2 Yerel geliştirme ortamı
- `docker-compose.yml`: PostgreSQL 16, Redis 7, (opsiyonel) Seq, pgAdmin. Sağlık kontrolleri (`healthcheck`) ve kalıcı volume'lar ile.
- `docker-compose.override.yml` ile geliştirme ayarları; `.env.example` dosyası (gerçek sır yok).
- API için çok aşamalı (`multi-stage`) `Dockerfile`: non-root kullanıcı, `ASPNETCORE_URLS=http://+:8080`, `HEALTHCHECK`.
- Port çakışması sorununa karşı `launchSettings.json` portlarını dokümante et; çalışan instance'ı bulmak için README'ye `netstat` / `Get-NetTCPConnection` notu ekle.

### 1.3 CI/CD (GitHub Actions)
- `ci.yml`: restore → build (`-warnaserror`) → test (Testcontainers ile gerçek PostgreSQL) → kod kapsama raporu → `dotnet format --verify-no-changes` → güvenlik taraması (`dotnet list package --vulnerable --include-transitive`, CodeQL).
- `release.yml`: Docker image build + push, migration bundle (`dotnet ef migrations bundle`) artefaktı üretimi.
- Dependabot yapılandırması (nuget + docker + github-actions, haftalık).
- Branch koruması önerisi: CI yeşil olmadan merge yok.

### 1.4 Ortam ve yapılandırma yönetimi
- Options pattern + `ValidateDataAnnotations().ValidateOnStart()`: `JwtSettings`, `MapSettings`, `Cors`, `ConnectionStrings`, yeni `RateLimitSettings`, `PresenceSettings`, `DispatchSettings` için. Eksik/hatalı ayarda uygulama **açılışta** anlaşılır mesajla durur.
- Ortamlar: `Development`, `Staging`, `Production`. `appsettings.Production.json` yalnızca güvenli, sırsız varsayılanlar içerir; sırlar ortam değişkeni / Azure Key Vault / Docker secrets üzerinden gelir.
- Özellik bayrakları (`Microsoft.FeatureManagement`): SmartAuto dağıtımı, push bildirimi, teslim kodu zorunluluğu gibi yeni özellikler bayrak arkasında açılsın.

### 1.5 Sağlık ve hazır olma
- `/health/live` (süreç ayakta mı) ve `/health/ready` (PostgreSQL, Redis, Hangfire storage, SMS/Push sağlayıcı erişimi). `AspNetCore.HealthChecks.*` paketleri; çıktı JSON.
- Açılışta DB/Redis hazır değilse **retry/backoff** ile bekle (Polly), ardından net hata ile çık. Hangfire ve başlangıç temizliği bu hazırlıktan sonra çalışsın.

---

## AŞAMA 2 — Kod stili, mimari düzen ve sürdürülebilirlik

### 2.1 Adlandırma ve dil standardı
- Kod (sınıf, metot, değişken, yorum başlıkları) **İngilizce**; kullanıcıya dönük mesajlar **çok dilli kaynak dosyalarından** (`Resources/Messages.tr.resx`, `Messages.en.resx`, `IStringLocalizer`). Kodda Türkçe düz metin hata mesajı kalmasın.
- Rol adları ve claim türleri magic string olmasın: `static class Roles { Admin, CourierFirm, Merchant, Courier }` (ve gerekiyorsa enum), `static class AppClaims { MerchantId, CourierId, ... }`. `"firm:manager"`, `"system"`, `"system:smart_auto"` gibi `CreatedBy/UpdatedBy` sabitleri `AuditActors` sınıfına taşınsın.
- Tutarsız claim adları (`merchantId`/`MerchantId`/`courierId`/`CourierId`/`courier_id`) için **tek standart** belirle; token üretiminde ve okumada yalnızca onu kullan (eski token uyumluluğu için kısa süreli okuma fallback'i bırak, sonra kaldır). SignalR payload'larındaki çift (camelCase + PascalCase) alanları tek biçime indir; eski istemciler için `v1` payload'ı koru, yenisi için versiyon alanı ekle.
- Dosya başı yorum satırlarını (`// Services/Concrete/...`) kaldır; XML doc yorumları kalsın ama yalnızca public API için.

### 2.2 Kod kalitesi araçları
- Roslyn analyzer'lar: `Microsoft.CodeAnalysis.NetAnalyzers`, `StyleCop.Analyzers` (kurallar makul seviyede), `SonarAnalyzer.CSharp`. Uyarıları CI'da hata say.
- `Nullable` uyarılarını sıfırla (`!` kullanımlarını gözden geçir, örn. `Get<JwtSettings>()!`).
- Karmaşıklık sınırı: metot > 50 satır veya iç içe > 3 seviye ise böl. `OrderService.UpdateStatusAsync` ve `TrySmartAutoAssignAsync` bölünecek ilk adaylar.
- Çok parametreli `OrderDto` (30+ pozisyonel parametre) ve `CourierDto` için: mapping'i tek yerde topla (`Mapster` veya elle yazılmış extension metotlar), kullanım amacına göre ayrı DTO'lar üret (`OrderListItemDto`, `OrderDetailDto`, `CourierOrderDto`). Kuryeye alıcının tüm bilgisi değil, yalnızca gerekli alanlar dönsün (veri minimizasyonu).

### 2.3 Domain modeli
- Anemik model yerine iş kurallarını entity içine taşı: `Order` içinde `Assign(courier)`, `PickUp()`, `Deliver()`, `Cancel(reason)`, `ReturnToPool()`; geçiş kuralları (state machine) ve değişmezler (invariants) entity'de, servis yalnızca orkestrasyon yapsın. Hatalı geçişte `DomainException`.
- Para için `Money` value object'i (tutar + para birimi, yuvarlama kuralı tek yerde); adres için `Address` value object'i (owned type); telefon için doğrulanmış `PhoneNumber` value object'i (E.164 normalizasyonu).
- Domain olayları (`OrderCreated`, `OrderAssigned`, `OrderDelivered`, `CourierWentOffline`) yayınlansın; SignalR bildirimi, audit log, push, istatistik bu olaylara abone olsun. Servis içinde doğrudan `_notificationService` çağrılarını azalt.
- `Order.CourierEarning`, `PackageFee` gibi mühürlü alanlar `private set` ile yalnızca domain metotlarıyla değişsin.

### 2.4 Katman sınırları
- Application katmanı EF Core'a bağımlı olmasın (karar: ya `IQueryable` okuma arayüzleri + repository, ya da `IApplicationDbContext`'i bilinçli kabul edip ADR'ye yaz). Mimari testler ekle: `NetArchTest.Rules` ile "Domain hiçbir katmana bağımlı olmaz", "Application, Infrastructure'a bağımlı olmaz", "Controller'lar DbContext kullanmaz".
- Unit of Work: servis başına tek `SaveChangesAsync`; birden çok aggregate değişiyorsa açık transaction.
- `GenericRepository`'nin `GetAllAsync(predicate)` gibi belleğe tüm veriyi çeken metotlarını kaldır/sınırla; spesifik, projeksiyonlu sorgular (`ReadModel`) kullan.

### 2.5 API tasarımı
- `ProducesResponseType` ile gerçek yanıt tipi uyumsuz: controller'lar `ServiceResult<T>` sarmalayıcısını dönüyor ama Swagger `OrderDto` gösteriyor. Ya `ProducesResponseType(typeof(ServiceResult<OrderDto>))` yap ya da başarılı yanıtlarda doğrudan DTO, hatalarda **RFC 7807 `ProblemDetails`** döndür (tercih edilen). Tüm hata biçimlerini tek standartta birleştir (şu an `ServiceResult`, `{message}` anonim nesne ve `ProblemDetails` karışık).
- `201 Created` yanıtlarında `Location` header'ı (`CreatedAtAction`).
- Sayfalama standardı: `?page=1&pageSize=50` + `X-Total-Count` header veya `PagedResult<T>`; filtre ve sıralama için ortak sorgu modeli. Sınırsız liste döndüren tüm `GetAll` uçlarını sayfala.
- API versiyonlama: `Asp.Versioning.Mvc`, URL segmenti `/api/v1/...`; Swagger'da versiyon başına doküman. Eski route'lar `v1`'e yönlendirilsin.
- Tutarlı route adlandırması: kebab-case, çoğul kaynak adları; fiil içeren route'ları (`/me/shift`, `/{id}/claim`) alt kaynak/aksiyon olarak belgele.
- `DateTime` yerine `DateTimeOffset` (UTC) kullanımı için ADR; en azından API sözleşmesinde ISO-8601 `Z` son ekiyle dön.
- Swagger: XML dokümanları, örnek istek/yanıtlar, JWT şeması, hata yanıt örnekleri. Production'da kapalı kalsın.

### 2.6 Hata yönetimi ve doğrulama
- Tek global hata yakalama (`IExceptionHandler` + `ProblemDetails`), `traceId` yanıtta. İç hata detayı Production'da dönmesin.
- Tüm request DTO'ları için FluentValidation (otomatik doğrulama); kurallar tek yerde. Telefon (TR formatı), e-posta, plaka, koordinat aralıkları, maks. uzunlukları.
- `ServiceResult` yerine (isteğe bağlı) `Result<T>`/`ErrorOr` kalıbı ve hata kodları (`Errors.Order.NotFound`) kullan; istemci sabit hata kodu ile çeviri yapabilsin.

---

## AŞAMA 3 — Güvenlik ve uyumluluk (ek sertleştirme)

> Düzeltme promptundaki Aşama 1 maddelerine ek olarak:

- **Girdi güvenliği:** İstek gövdesi boyutu limiti, `[ApiController]` model state otomatik 400, string alanlarda kontrol karakteri/HTML temizleme (adres, not alanları), sipariş notlarında maksimum uzunluk.
- **Kimlik:** Refresh token rotasyonu, cihaz bazlı oturum listesi (`GET /api/auth/sessions`) ve tek cihazdan çıkış/tüm cihazlardan çıkış; şifre değişiminde tüm oturumların iptali. Kurye cihazı değişimini audit'e yaz. İsteğe bağlı: yönetici hesapları için TOTP 2FA.
- **Yetkilendirme modeli:** Rol tabanlı yerine **kaynak tabanlı** yetkilendirme (`IAuthorizationService` + `IAuthorizationHandler`): `OrderOperationRequirement`, `CourierOwnershipRequirement`. Tüm sahiplik kontrolleri bu handler'larda merkezi olsun.
- **Denetim izi (audit):** Mevcut `AuditLog`'u genişlet: her finansal ve yetki değişikliği (rol değişimi, mahsuplaşma, bakiye düzeltme, şifre sıfırlama, kurye silme) için `Who/What/When/Old→New/IP/UserAgent/CorrelationId`. Audit tablosu **yalnızca-ekleme** (append-only); uygulama kullanıcısına UPDATE/DELETE yetkisi verme. Yönetici için filtreli audit sorgu endpoint'i.
- **Güvenlik başlıkları:** `Content-Security-Policy` (API için kısıtlı), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (Production). Kestrel `Server` başlığını kapat.
- **Rate limiting (genel):** `PartitionedRateLimiter` ile kullanıcı/IP bazlı: genel API (örn. 120/dk), konum uçları, sipariş oluşturma (örn. 30/dk/işletme), şifre işlemleri (sıkı). Limit aşımlarını logla ve metrik olarak yayınla.
- **Bağımlılık güvenliği:** NuGet paketlerini güncel tut, `dotnet list package --vulnerable` CI'da çalışsın; SBOM üret (`CycloneDX`); Docker image tarama (Trivy).
- **Veritabanı güvenliği:** Uygulama kullanıcısı en az yetkiyle (DDL yetkisi yok; migration ayrı kullanıcıyla); TLS zorunlu bağlantı (`SslMode=Require` Production'da); şifreli yedek.
- **Hassas veri:** Alıcı telefonu ve adresi için kolon düzeyinde şifreleme veya en azından maskeleme (kurye ekranında telefon son 4 hane maskeli, sipariş aktifken açılır). Loglarda PII maskeleme (telefon, e-posta, adres).
- **KVKK/GDPR:** (1) Veri saklama politikası: tamamlanmış siparişlerin alıcı bilgisi N gün sonra anonimleştirilsin (Hangfire recurring job); (2) kişisel veri dışa aktarma ve silme/anonimleştirme talebi endpoint'leri (`/api/privacy/export`, `/api/privacy/erase`) yalnızca yetkili rolle; (3) kurye konum geçmişi saklanıyorsa süre sınırı, saklanmıyorsa ADR'de belgelendi; (4) aydınlatma metni sürümü ve kabul kaydı (`ConsentRecord`).
- **Tehdit modeli:** `docs/security/threat-model.md` (STRIDE tablosu: kimlik sahteciliği, konum sahteciliği, bakiye manipülasyonu, çift harcama/çift mahsuplaşma, enumerasyon). Her tehdit için karşı önlem ve test referansı.

---

## AŞAMA 4 — Ürün özellikleri

### 4.1 Idempotency
- `Idempotency-Key` header desteği: `POST /api/orders`, mahsuplaşma, ödeme/bakiye işlemleri. Anahtar + kullanıcı + istek hash'i + yanıt `IdempotencyRecord` tablosunda (24 saat TTL, Hangfire temizliği). Aynı anahtarla aynı istek → kayıtlı yanıt; farklı gövde → 422. Middleware/filter olarak uygula.

### 4.2 Teslimat kanıtı (Proof of Delivery)
- Sipariş oluşturulunca 4 haneli `DeliveryCode` üretilir (kriptografik rastgele, hash'li saklanır, alıcıya SMS ile gider; `ISmsService`).
- `Delivered` geçişi için kurye `{ deliveryCode }` veya `{ photoUrl }` + konum göndermeli; işletme bazında "teslim kodu zorunlu" ayarı (`Merchant.RequireDeliveryCode`, feature flag ile).
- Teslimat noktası koordinatı ile kurye konumu arasındaki mesafe eşik (örn. 300 m) dışındaysa uyarı/engel ve audit kaydı.
- Fotoğraf yükleme: S3 uyumlu depolama (MinIO yerel, bulut prod), ön imzalı URL, boyut/tür sınırı, virüs tarama kancası.

### 4.3 Gerçek yol mesafesi ve süre tahmini
- `IRoutingService` soyutlaması: sağlayıcılar `OsrmRoutingService`, `GoogleRoutingService` (mevcut `MapSettings.ActiveMapProvider` ile seçilir), yedek olarak `HaversineRoutingService`. Zaman aşımı + Polly circuit breaker + Redis önbellek (koordinat çifti → mesafe/süre, 10 dk).
- `EstimatedDistanceKm`, `EstimatedDeliveryMinutes` sabit 25 yerine bu servisten gelsin; sipariş yanıtında `EtaMinutes` yenilenebilsin.

### 4.4 Dağıtım motoru (gerçek H3/batching)
- Ayarlarda var ama kullanılmayan `HexagonSizeMeters`, `OrderBatchingTimeMinutes`, `CrossRestaurantDistanceMeters` alanlarını **gerçekten uygula** veya kaldır (ADR ile karar):
  - `H3.net` paketi ile kurye konumlarını hex hücrelerine indeksle (Redis GEO/sets); aday arama `kRing` ile.
  - **Toplu atama (batching):** `OrderBatchingTimeMinutes` penceresinde gelen yakın siparişleri aynı kuryeye grupla (`MaxOrdersPerTour` sınırıyla); farklı restoranlardan siparişler `CrossRestaurantDistanceMeters` içindeyse aynı tura al.
  - Puanlama fonksiyonu: `skor = w1*mesafe + w2*aktifSiparişYükü + w3*kuryeKabulOranı + w4*beklemeSüresi`; ağırlıklar yapılandırılabilir.
  - Atama teklifi modeli: kuryeye X saniye süreli teklif (kabul/ret), ret/zaman aşımında bir sonraki aday; `OrderOffer` tablosu ve SignalR/push ile bildirim.
  - Dağıtım kararlarını `DispatchDecisionLog` tablosuna yaz (neden bu kurye? hangi adaylar elendi?); anlaşmazlık ve ayar iyileştirmesi için.
  - Algoritmayı saf (pure) bir sınıfa (`IDispatchStrategy`) ayır, birim testlerle doğrula (deterministik girdi/çıktı).

### 4.5 Bildirimler
- Kuryeye yeni sipariş/atama için FCM push (Android/iOS): `DeviceToken` tablosu (kullanıcı, platform, token, son görülme), kayıt/silme endpoint'leri, geçersiz token temizliği. SignalR bağlı değilse push'a düş.
- Alıcıya sipariş durum SMS'i (atandı, yola çıktı, teslim edildi) ve takip linki: imzalı, süreli `TrackingToken` ile herkese açık kısıtlı takip endpoint'i (yalnızca durum + kurye konumu, kişisel veri yok).
- Bildirimler Hangfire kuyruğunda, retry (üstel geri çekilme) ve **outbox deseni** ile: sipariş durumu DB'ye yazılırken `OutboxMessage` aynı transaction'da eklenir, arka plan işçisi gönderir (kayıp bildirim olmasın).
- Bildirim tercihleri (işletme bazlı açma/kapama).

### 4.6 Finans ve defter (ledger)
- `LedgerEntry` tablosu (çift taraflı muhasebe mantığıyla): `CourierId`, `MerchantId`, `OrderId?`, `SettlementId?`, `Type` (CashCollected, EarningAccrued, SettlementPayout, Adjustment, Reversal), `Amount`, `BalanceAfter`, `CreatedAt`, `CreatedBy`. `Courier.CurrentBalance` bu defterden türetilsin (veya her zaman defterle uzlaştırılsın); kayıtlar değiştirilemez, düzeltmeler ters kayıtla yapılır.
- Mahsuplaşma, kuryeye yapılan **ödeme/tahsilat** işlemini kaydetsin (nakit mi, havale mi, referans no).
- Günlük/haftalık/aylık otomatik kapanış (`ReconciliationPeriod`'a göre Hangfire job): dönem sonu özet raporu oluşturur, işletmeye bildirir.
- Raporlar: CSV/XLSX/PDF dışa aktarma (`/api/reports/...`), dönem filtresi, kurye bazlı döküm; büyük raporlar Hangfire'da asenkron üretilip indirme linki ile sunulsun.
- Para birimi ve yuvarlama: `decimal(18,2)`, `MidpointRounding.AwayFromZero`, tek `MoneyRounding` yardımcı sınıfı.

### 4.7 Kurye yönetimi ve performans
- Vardiya geçmişi (`ShiftLog`: başlangıç, bitiş, süre, toplam teslimat), kurye performans metrikleri (ortalama teslim süresi, kabul/ret oranı, iptal oranı, müşteri puanı), liderlik tablosu.
- Müşteri/işletme değerlendirmesi (`DeliveryRating` 1–5 + yorum), düşük puanlı teslimatlar için işletmeye bildirim.
- Kurye belge ve onay akışı (ehliyet, ruhsat, sigorta son kullanma tarihi) ve süresi dolan belge için uyarı + otomatik pasife alma.
- Bölge/zone yönetimi: işletme için teslimat bölgeleri (poligon), bölge dışı sipariş reddi, bölgeye göre dinamik teslimat ücreti.

### 4.8 İşletme ve sipariş özellikleri
- Zamanlanmış (ileri tarihli) siparişler: `ScheduledFor`, hazır olma zamanına göre otomatik havuza düşme (Hangfire).
- İptal nedenleri (enum + serbest metin), iade/ücret politikası, iptal edenin rolü audit'e.
- Entegrasyonlar için **webhook**'lar: işletme kendi URL'sini kaydeder, olaylar (`order.created`, `order.assigned`, `order.delivered`) HMAC imzalı gönderilir, retry + ölü mektup kuyruğu; ve dış sistemlerden sipariş almak için API anahtarı (`X-Api-Key`, hash'li saklanan, kapsam sınırlı).
- Sipariş arama/filtre: tarih aralığı, durum, kurye, ödeme yöntemi, serbest metin; Postgres `pg_trgm` indeksi.
- Ürün/menü: stok durumu, seçenekler/ekstralar, kategori sıralaması; toplu içe aktarma (Excel) için doğrulama raporu (satır bazlı hata listesi).

---

## AŞAMA 5 — Ölçeklenebilirlik, gözlemlenebilirlik ve operasyon

- **SignalR:** Redis backplane (`AddStackExchangeRedis`), gruplar üzerinden hedefli yayın, bağlantı sayısı ve gecikme metriği. Yük testinde (k6/NBomber) 1.000 eşzamanlı kurye konum yayını senaryosu.
- **Önbellek:** Sık okunan veriler (işletme ayarları, ürün listesi, aktif kurye listesi) için `IDistributedCache`/`HybridCache` + etiketli geçersizleştirme; Redis kesintisinde (circuit breaker) DB'ye düşme.
- **Gözlemlenebilirlik:** OpenTelemetry (trace + metrics + logs) → OTLP; Prometheus/Grafana panoları: istek gecikmesi, hata oranı, aktif kurye sayısı, atama süresi, Hangfire kuyruk uzunluğu, DB bağlantı havuzu. Serilog → Seq/Loki; `CorrelationId` her log ve yanıtta. Kritik alarmlar: 5xx oranı, atanamayan sipariş sayısı, Hangfire hata artışı, DB bağlantı hatası.
- **Dayanıklılık:** Dış çağrılarda (SMS, push, routing) Polly: timeout, retry (jitter), circuit breaker, bulkhead. Hangfire job'ları idempotent ve `AutomaticRetry` sınırlı; ölü işler için `DeadLetter` izleme.
- **Veritabanı:** Bağlantı havuzu ayarları, `EnableRetryOnFailure` ile birlikte kritik işlemlerde **açık transaction + `CreateExecutionStrategy`**; yavaş sorgu logu; `EXPLAIN` ile kritik sorguların gözden geçirilmesi; eski siparişler için bölümleme (partitioning) veya arşiv tablosu stratejisi (ADR).
- **Yedekleme ve felaket kurtarma:** Günlük otomatik şifreli yedek + WAL arşivleme (PITR), aylık geri yükleme tatbikatı, RPO/RTO hedefleri `docs/ops/runbook.md` içinde. Migration'lar için geri alma planı.
- **Runbook'lar:** "Atanamayan siparişler birikti", "DB bağlantısı koptu", "Hangfire durdu", "kurye konumları gelmiyor" için adım adım operasyon dokümanları.
- **Dağıtım:** Sıfır kesintili dağıtım (rolling), migration'ları uygulamadan önce ayrı adımda çalıştırma, geri alınabilir sürümler; yapılandırma değişikliklerinde yeniden başlatma gerektirmeyen `IOptionsMonitor`.

---

## AŞAMA 6 — Test stratejisi ve kalite kapıları

- **Test piramidi:** Birim (domain kuralları, dağıtım stratejisi, mahsuplaşma hesabı), entegrasyon (`WebApplicationFactory` + Testcontainers PostgreSQL/Redis), sözleşme testleri (Swagger şeması değişimini yakalayan `OpenAPI diff`), mimari testler (`NetArchTest`), yük testleri (k6/NBomber), güvenlik testleri (yetkisiz erişim matrisi: her endpoint × her rol).
- **Mutasyon testi** (`Stryker.NET`) en azından finansal ve dağıtım modülleri için.
- **Özellik tabanlı testler** (`FsCheck`): mahsuplaşma toplamlarının defter bakiyesiyle her zaman eşleştiği, durum makinesinde geçersiz geçişin asla kabul edilmediği gibi değişmezler.
- **Kapsama hedefi:** Domain ve Application ≥ %80, kritik finansal akışlar ≥ %90; CI'da altına düşerse kırmızı.
- **Tohum veri ve demo:** Geliştirme için `DbSeeder` (işletme, kurye, sipariş örnekleri; rastgele değil sabit tohumlu `Bogus`), production'da asla çalışmaz.
- **Dokümantasyon:** `docs/` altında mimari genel bakış (C4), ADR'ler, API kullanım rehberi, olay/sinyal sözleşmeleri (SignalR olay listesi ve payload şemaları), veri sözlüğü.

---

## ÇIKTI FORMATI

Her aşama için sırayla:
1. **Plan:** yapılacakların kısa listesi ve varsayımlar (belirsizlik varsa önce soru).
2. **Uygulama:** değişen/eklenen dosyaların listesi.
3. **Migration'lar:** adı, amacı, geri alma etkisi, veri kaybı riski.
4. **Testler:** eklenen testler ve sonuç özeti (`dotnet test` çıktısı).
5. **Riskler ve istemci etkisi:** mobil/web tarafında yapılması gerekenler, kırıcı değişiklikler.
6. **ADR/dokümanlar:** eklenen dosyalar.

Aşamayı bitirmeden bir sonrakine geçme. Her aşama sonunda "tamamlandı / eksik kalanlar" özeti ver.
