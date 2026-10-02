# 🛵 KuryeSistemi — Çok Kiracılı (Multi-Tenant) Akıllı Kurye & Lojistik Platformu

Modern, yüksek performanslı ve gerçek zamanlı kurye dağıtım ve operasyon yönetim platformu.

---

## 🏗️ Proje Mimarisi (Monorepo)

```text
kuryesistemi/
├── Backend/          # .NET 8 Web API, PostgreSQL, Redis, SignalR Realtime Hubs
├── merchant_web/     # React 19 + Vite + TypeScript (İşletme & Lojistik Firma Portali)
├── kurye_mobil/      # Flutter (iOS & Android) Kurye Saha Kokpiti & Canlı GPS Takip
└── docker-compose.yml # PostgreSQL ve Redis altyapı konteynerleri
```

---

## ⚡ Temel Özellikler

### 1. 🏢 Kurye Lojistik Firması Paneli (`merchant_web/src/pages/firm`)
- **Canlı Filo Haritası (Radar):** Sahadaki tüm kuryelerin renk kodlu GPS hareketleri ve durumları.
- **Çoklu Restoran Yönetimi:** Farklı restoranların sözleşme şartları, paket başı ücretleri ve dağıtım modelleri.
- **Dağıtım Stratejileri:** Havuz (Pool), Manuel Atama (Manual) ve Akıllı Otonom (SmartAuto - H3 Hexagon).
- **Finans & Kasa Mahsuplaşması:** Kurye nakit tahsilatları, gün sonu kasa sıfırlama, alacak-verecek mutabakatı.
- **Alt Kullanıcı & Yetkilendirme:** Şube yöneticisi, operatör ve muhasebe rolleri.

### 2. 🏪 İşletme / Restoran Paneli (`merchant_web`)
- **Hızlı Sipariş (POS):** Menüden ürün seçimi veya sepetsiz tek dokunuşla hızlı sipariş girişi.
- **Sipariş Akış Tablosu (Kanban):** Mutfak onayından teslimata kadar canlı durum akışı ve **Tek Tıkla Kurye Görevlendirme Modalı**.
- **Canlı Saha Radarı:** Restoran çevresindeki müsait kuryeler ve Uber H3 kapsama alanı.
- **Kasa Takibi:** Günlük teslimat hakedişi ve kurye firma mutabakatı.

### 3. 📱 Mobil Kurye Uygulaması (`kurye_mobil` - Flutter)
- **Kurye Kokpiti:** Mesai kaydırma çubuğu, anlık hakediş & paket sayaçları.
- **Havuzdan Görev Kabulü:** Havuzdaki siparişleri tek tuşla üzerine alma (`claim`).
- **Canlı Harita & Navigasyon:** OpenStreetMap üzerinde rota, kurye GPS pini, hız HUD göstergesi.
- **Büyük Operasyon Butonu:** "Paketi Aldım" ➔ "Müşteriye Teslim Ettim" aşama yönetimi.
- **SignalR Push Bildirimleri:** "🔔 Yeni Havuz Siparişi" ve "📦 Size Yeni Görev Atandı" anlık sesli & titreşimli alarmlar.

---

## 🚀 Hızlı Başlangıç

### 1. Altyapı Servisleri (Docker)
```bash
docker-compose up -d
```

### 2. Backend (.NET 8 Web API)
```bash
cd Backend/src/KuryeSistemi.API
dotnet run
```
API adresi: `http://localhost:5000` (Swagger: `http://localhost:5000/swagger`)

### 3. Web Panelleri (İşletme & Firma)
```bash
cd merchant_web
npm install
npm run dev
```
Web adresi: `http://localhost:5173`

### 4. Mobil Kurye Uygulaması (Flutter)
```bash
cd kurye_mobil
flutter pub get
flutter run
```

---

## 🛡️ Lisans
Tüm hakları saklıdır.
