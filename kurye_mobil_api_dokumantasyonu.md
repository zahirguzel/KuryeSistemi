# 📱 Kurye Mobil Uygulaması (Flutter) — API & WebSocket Entegrasyon Rehberi

**Dokümantasyon Tarihi:** 15.09.2026  
**Hedef Platform:** Flutter (iOS & Android)  
**Backend Versiyonu:** .NET 8 Clean Architecture (REST API + SignalR WebSocket)  
**Sunucu Base URL:** `http://localhost:5000/api` (veya sunucu IP'si)  
**WebSocket Hub URL:** `http://localhost:5000/hubs/location`

---

## 1. Mimarisi ve İletişim Protokolleri

Kurye mobil uygulaması iki temel kanalla backend ile haberleşir:
1. **REST API (HTTPS/JSON):** Kimlik doğrulama, sipariş kabul/teslimat işlemleri, geçmiş siparişler, bakiye/hakediş sorguları.
2. **SignalR WebSocket (`/hubs/location`):**
   - **Giden (Upstream):** Kuryenin canlı GPS koordinatlarının (Latitude, Longitude) düzenli akışı.
   - **Gelen (Downstream):** Yeni açık sipariş teklifleri, atama bildirimleri, sipariş iptal alarmları.

---

## 2. Kimlik Doğrulama & Yetkilendirme (JWT)

### `POST /api/auth/login`
Kurye sisteme telefon/e-posta ve şifresi ile giriş yapar.

**İstek (Request Body):**
```json
{
  "email": "kurye@orneksistem.com",
  "password": "KuryeSifre123!"
}
```

**Başarılı Yanıt (Response 200 OK):**
```json
{
  "isSuccess": true,
  "statusCode": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-09-22T12:00:00Z",
    "user": {
      "id": "c3b12345-6789-4abc-def0-123456789abc",
      "name": "Ahmet Yılmaz",
      "email": "kurye@orneksistem.com",
      "role": "Courier",
      "courierId": "f7a98765-4321-4cba-9876-fedcba098765",
      "merchantId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    }
  },
  "message": "Giriş başarılı."
}
```

> **Önemli:** Alınan `token` degeri tüm REST API isteklerinde `Authorization: Bearer <TOKEN>` başlığı olarak, SignalR bağlantısında ise `accessTokenFactory` üzerinden iletilmelidir.

---

## 3. Gerçek Zamanlı GPS & SignalR WebSocket Entegrasyonu

### 3.1. Hub Bağlantısı Kurma (Flutter `signalr_netcore` veya `signalr_core`)

```dart
final hubConnection = HubConnectionBuilder()
    .withUrl(
      'http://<SUNUCU_IP>:5000/hubs/location',
      options: HttpConnectionOptions(
        accessTokenFactory: () async => userJwtToken,
        transport: HttpTransportType.webSockets,
      ),
    )
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .build();

await hubConnection.start();
```

### 3.2. Canlı Konum Gönderme (Arka Plan / Ön Plan Servisi)
Kuryenin konumu her 5-10 saniyede bir veya 20 metre hareket ettiğinde hub üzerinden sunucuya gönderilir:

```dart
// Hub Metot Adı: "SendLocationUpdate"
// Parametreler: double latitude, double longitude
await hubConnection.invoke('SendLocationUpdate', args: [latitude, longitude]);
```

### 3.3. Sunucudan Gelen Olayları Dinleme (Push Bildirimler & Ekran Güncellemeleri)

```dart
// 1. Canlı Sipariş Durum Güncellemesi
hubConnection.on('ReceiveOrderStatusUpdate', (arguments) {
  final payload = arguments[0]; // orderId, status, message
  // Sipariş atandıysa veya havuza yeni sipariş düştüyse yerel sesli bildirim çal
});
```

---

## 4. Sipariş Yönetimi REST API Endpoint'leri

### 4.1. Kuryenin Aktif ve Geçmiş Siparişlerini Getirme
`GET /api/couriers/{courierId}/orders`

**Headers:** `Authorization: Bearer <TOKEN>`

**Örnek Yanıt:**
```json
{
  "isSuccess": true,
  "data": [
    {
      "id": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
      "orderCode": "ORD-1042",
      "merchantName": "Dönerci Ali Usta",
      "merchantAddress": "Çarşı Mah. 12. Sokak No:4 İskenderun",
      "merchantLatitude": 36.5867,
      "merchantLongitude": 36.1714,
      "recipientName": "Mehmet Demir",
      "recipientPhone": "0532 999 88 77",
      "deliveryAddress": "Karaağaç Mah. Sahil Cad. No:18/2",
      "deliveryLatitude": 36.5720,
      "deliveryLongitude": 36.1605,
      "status": "Assigned", // veya "PickedUp"
      "paymentMethod": "Cash", // Nakit (Kurye tahsil edecek)
      "totalOrderAmount": 350.00,
      "courierEarning": 50.00,
      "createdAt": "2026-09-15T11:30:00Z"
    }
  ]
}
```

---

### 4.2. Havuzdaki Açık Siparişleri Listeleme (Havuz Modu Kuryeler İçin)
`GET /api/orders?status=0` (veya `Created` / `Pending`)

Kurye müsait durumdayken ortak havuza düşen teslim edilmeyi bekleyen paketleri bu endpoint ile listeler.

---

### 4.3. Havuzdan Sipariş Alma (Kurye Kendine Atama)
`PUT /api/orders/{orderId}/assign`

**Headers:** `Authorization: Bearer <TOKEN>`  
**Body:**
```json
{
  "courierId": "f7a98765-4321-4cba-9876-fedcba098765"
}
```

---

### 4.4. Siparişi Restorandan Teslim Alma (Yola Çıkma)
`PUT /api/orders/{orderId}/status`

**Body:**
```json
{
  "status": "PickedUp" // veya int 2
}
```

---

### 4.5. Siparişi Müşteriye Teslim Etme & Tahsilat
`PUT /api/orders/{orderId}/status`

**Body:**
```json
{
  "status": "Delivered" // veya int 3
}
```
> **Finansal Etki:** Sipariş teslim edildiğinde;
> - Eğer ödeme şekli `Cash` (Nakit) ise kuryenin bakiyesinden sipariş tutarı düşer (Kurye firmaya nakit borçlanır).
> - Kuryenin hakediş tutarı (`courierEarning`) bakiyesine eklenir.

---

## 5. Kurye Profil & Kasa Bakiye Sorgulama

### `GET /api/couriers/{courierId}`
Kuryenin güncel nakit borç/alacak bakiyesini, toplam teslimat sayısını ve çalışma durumunu döner.

**Örnek Yanıt:**
```json
{
  "isSuccess": true,
  "data": {
    "id": "f7a98765-4321-4cba-9876-fedcba098765",
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "phoneNumber": "0555 123 45 67",
    "isAvailable": true,
    "currentBalance": -450.00, // -450 TL nakit borç
    "totalDeliveredCount": 18
  }
}
```

### Kurye Müsaitlik Durumunu Değiştirme (Çevrimiçi / Molada)
`PUT /api/couriers/{courierId}`

**Body:**
```json
{
  "isAvailable": false // Molada veya Çevrimdışı
}
```

---

## 6. Flutter Proje Mimarisi Önerisi

Mobil uygulama geliştirilirken aşağıdaki katmanlı yapı önerilir:

```text
lib/
├── core/
│   ├── constants/        # API URL'leri, renkler, fontlar
│   ├── network/          # Dio HTTP istemcisi & Interceptor'lar
│   ├── services/
│   │   ├── signalr_service.dart   # WebSocket & Hub yönetimi
│   │   ├── location_service.dart  # Geolocator arka plan GPS
│   │   └── audio_service.dart     # Sipariş uyarı zilleri
│   └── storage/          # FlutterSecureStorage (JWT Token saklama)
├── features/
│   ├── auth/             # Login ekranı & Riverpod/Bloc state
│   ├── home/             # Ana ekran (Harita, aktif rota, durum anahtarı)
│   ├── orders/           # Aktif siparişler, Havuz (Pool), Sipariş Detay
│   └── wallet/           # Kasa, Hakediş, Geçmiş mahsuplaşma raporları
└── main.dart
```

---

## 7. Dağıtım Modları (Atama Usulleri) & Mobil/Web Entegrasyonu

Sistemde her işletmenin veya kurye filosunun ayarlarından (`DispatchMode`) belirlenebilen **3 Farklı Dağıtım / Atama Modeli** mevcuttur. Backend, Web Paneli ve Flutter Mobil bu 3 modele tam uyumlu çalışacak şekilde kurgulanmıştır:

| Dağıtım Modu | Backend Davranışı | Web Paneli (Firma/Restoran) | Flutter Mobil Kurye Deneyimi |
|---|---|---|---|
| **📡 1. Havuz Sistemi (`Pool = 1`)** *(Kurye Kendisi Alır)* | Sipariş `Pending` (Kuryesiz) olarak açılır. WebSocket ile tüm bağlı/müsait kuryelere yayınlanır. | Sipariş "Açık Havuz"da listelenir. Kuryelerden biri alana kadar bekler. | Kurye mobil uygulamasında **"Açık Sipariş Havuzu"** sekmesini açar. Paket ücretini, mesafeyi görüp **"Siparişi Üzerime Al"** butonuna basar (`PUT /api/orders/{id}/assign`). İlk basan kurye paketi alır. |
| **🎯 2. Manuel Atama (`Manual = 2`)** *(Yönetici Seçer)* | Sipariş oluşturulur. Yönetici panelden bir kurye seçene kadar atanmaz. | Yönetici canlı radardan veya sipariş listesinden istediği kuryeyi seçip **"Kuryeye Ata"** der. | Kuryenin ekranına doğrudan **"Size Yeni Sipariş Atandı!"** modal penceresi ve sesli bildirim gelir. Kurye doğrudan restorana navigasyonu başlatır. |
| **🤖 3. Akıllı GPS Atama (`SmartAuto = 3`)** *(En Yakın Kurye)* | Sipariş geldiğinde sistem restoran koordinatına en yakın, çevrimiçi ve müsait kuryeyi Redis GPS verisinden hesaplar ve siparişi o kuryeye teklif eder. | Sipariş anında en uygun kuryeye yönlendirilir; yönetici canlı radarda rotayı takip eder. | Seçilen en yakın kuryenin telefonunda **30 saniyelik geri sayım sayacı** ve yüksek sesli alarm ile **"Yeni Sipariş Teklifi"** açılır. Kurye onaylarsa paket kuryeye bağlanır; reddederse veya süre biterse sıradaki en yakın 2. kuryeye geçer. |

---

## 8. Flutter Ekranları & Uygulama Akış Kod Örnekleri

### 8.1. Havuz Modu Sipariş Listeleme ve Kabul Etme (Pool Mode)
```dart
// Havuzdaki siparişleri çekme: GET /api/orders?status=0
Future<void> acceptPoolOrder(String orderId, String courierId) async {
  final response = await dio.put(
    '/orders/$orderId/assign',
    data: {'courierId': courierId},
    options: Options(headers: {'Authorization': 'Bearer $jwtToken'}),
  );

  if (response.statusCode == 200) {
    // Sipariş başarıyla alındı -> Aktif Sipariş Ekranına yönlendir
  } else {
    // Başka bir kurye daha önce kaptıysa uyarı göster: "Sipariş başka bir kurye tarafından alındı."
  }
}
```

### 8.2. Akıllı GPS Modu Geri Sayımlı Teklif Penceresi (SmartAuto Offer Dialog)
```dart
// SignalR 'ReceiveOrderOffer' olayını dinleme
hubConnection.on('ReceiveOrderOffer', (arguments) {
  final offer = arguments[0]; // orderId, merchantName, packageFee, distanceKm, expireSeconds (30)
  
  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => OrderOfferCountdownDialog(
      offerData: offer,
      onAccept: () => acceptOrder(offer['orderId']),
      onReject: () => rejectOrder(offer['orderId']),
    ),
  );
});
```

### 8.3. Sipariş Durum Güncelleme (PickedUp -> Delivered)
```dart
// 1. Restorandan Paketi Teslim Alırken (Yola Çıktım)
await dio.put('/orders/$orderId/status', data: {'status': 2}); // 2: PickedUp

// 2. Müşteriye Teslim Ettiğinde ve Nakit/Kart Tahsilatı Yaptığında
await dio.put('/orders/$orderId/status', data: {'status': 3}); // 3: Delivered
// Bu işlem kuryenin güncel kasa bakiyesini ve hakedişini sunucuda otomatik hesaplar.
```

---

## 9. Sık Sorulan Entegrasyon Soruları (FAQ)

1. **Kurye aynı anda birden fazla sipariş alabilir mi?**
   - Evet, kurye kapasitesi dahilinde (varsayılan 3 aktif paket) havuzdan ek sipariş alabilir veya yönetici ek paket atayabilir.
2. **Kurye çevrimdışıyken havuza veya atamalara düşer mi?**
   - Hayır, kurye `isAvailable: false` durumuna geçtiğinde akıllı GPS veya havuz teklifleri bu kuryeye yönlendirilmez.
3. **Nakit tahsil edilen siparişlerde kurye kasası nasıl işler?**
   - Müşteriden nakit tahsil edilen tutar kurye bakiyesine eksi (borç) olarak yansır. Kuryenin teslimat başı kazancı (örn. 50 TL) artı (alacak) olarak eklenir. Gün sonunda Firma Panelindeki "Mahsuplaş" butonu ile kasa sıfırlanır.

