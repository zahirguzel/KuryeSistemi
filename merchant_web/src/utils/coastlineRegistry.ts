// src/utils/coastlineRegistry.ts
//
// Çok Şehirli Kıyı & Kara Tespiti Kayıt Kütüğü (Multi-City Coastline & Land Registry)
// Türkiye'nin kıyı şehirleri (İskenderun/Hatay, Mersin, Antalya, İzmir, İstanbul vb.) için
// haritada altıgenlerin denize değil karaya döşenmesini sağlayan coğrafi kara/deniz sınırları.

export interface GeoPolygon {
  name: string;
  isWater: boolean; // true ise bu poligon deniz/körfezdir
  bounds: [number, number][]; // [lat, lng] köşe noktaları
}

/**
 * Nokta çokgen içinde mi (Ray-Casting Algorithm)
 */
export function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Türkiye Kıyı & Körfez Su Kütleleri Tanımları
 * Bu poligonların içi DENİZ / SU kabul edilir.
 */
export const WATER_BODIES: GeoPolygon[] = [
  // 1. İskenderun Körfezi (Akdeniz Kıyı Çizgisi ve Körfez Alanı)
  {
    name: 'İskenderun Körfezi ve Doğu Akdeniz Suları',
    isWater: true,
    bounds: [
      [36.85, 35.50], // Ceyhan/Yumurtalık açıkları
      [36.85, 35.85],
      [36.75, 36.10], // Payas açıkları
      [36.62, 36.14], // İskenderun Liman açığı
      [36.56, 36.13], // İskenderun sahil şeridi sınırı
      [36.42, 35.90], // Arsuz açıkları
      [35.80, 35.70], // Samandağ açıkları
      [35.80, 35.40],
      [36.50, 35.30],
    ],
  },
  // 2. Mersin Körfezi Suları
  {
    name: 'Mersin Körfezi',
    isWater: true,
    bounds: [
      [36.80, 34.60],
      [36.75, 34.75],
      [36.65, 34.90],
      [36.40, 34.50],
      [36.50, 34.10],
    ],
  },
  // 3. Antalya Körfezi Suları
  {
    name: 'Antalya Körfezi',
    isWater: true,
    bounds: [
      [36.88, 30.68],
      [36.85, 30.80],
      [36.50, 31.00],
      [36.20, 30.50],
      [36.50, 30.40],
    ],
  },
  // 4. İzmir Körfezi Suları
  {
    name: 'İzmir Körfezi',
    isWater: true,
    bounds: [
      [38.48, 26.90],
      [38.45, 27.12],
      [38.41, 27.15],
      [38.38, 27.05],
      [38.35, 26.80],
    ],
  },
  // 5. Marmara Denizi (İstanbul Güney Suları)
  {
    name: 'Marmara Denizi - İstanbul Kıyı Suları',
    isWater: true,
    bounds: [
      [40.97, 28.70], // Bakırköy açıkları
      [40.98, 28.98], // Tarihi Yarımada güneyi
      [40.95, 29.08], // Kadıköy/Adalar açıkları
      [40.85, 29.10],
      [40.80, 28.70],
    ],
  },
];

/**
 * Verilen koordinatın karada olup olmadığını tespit eder.
 * @param lat Enlem
 * @param lng Boylam
 * @returns true: Karada, false: Denize düşüyor
 */
export function isCoordinateOnLand(lat: number, lng: number): boolean {
  // Türkiye genel sınırları kontrolü (yaklaşık)
  if (lat < 35.8 || lat > 42.2 || lng < 25.6 || lng > 44.9) {
    return true; // Türkiye dışındaysa varsayılan olarak engelleme
  }

  // Tanımlı su kütlelerini tara
  for (const water of WATER_BODIES) {
    if (isPointInPolygon(lat, lng, water.bounds)) {
      return false; // Denize düşüyor!
    }
  }

  // İskenderun sahili için yüksek hassasiyetli mikro-kıyı çizgisi (Arsuz - Karaağaç - İskenderun - Dörtyol hattı)
  const coastLng = getIskenderunCoastlineLongitude(lat);
  if (coastLng !== null && lng < coastLng) {
    return false; // Akdeniz Suları (Deniz)
  }

  return true;
}

/**
 * İskenderun Körfezi sahil şeridi referans GPS noktaları (Arsuz'dan Dörtyol'a).
 * Karaağaç Uğur Mumcu / Plaj hattındaki işletmeleri (36.5668, 36.1128) karada tutar,
 * deniz sınırını sahil kordonuna (40-50m batıya) kenetler.
 */
const ISKENDERUN_COASTLINE_POINTS: [number, number][] = [
  [36.35, 35.80],
  [36.40, 35.88], // Arsuz
  [36.50, 36.01],
  [36.54, 36.065],
  [36.56, 36.096], // Güney Karaağaç
  [36.57, 36.120], // Karaağaç Plaj / Uğur Mumcu Caddesi
  [36.585, 36.140], // İskenderun Teknik Üni / Sahil
  [36.60, 36.170], // İskenderun Liman
  [36.65, 36.190],
  [36.75, 36.215], // Payas / Dörtyol
  [36.85, 36.220],
];

export function getIskenderunCoastlineLongitude(lat: number): number | null {
  if (lat < 36.35 || lat > 36.85) return null;
  for (let i = 0; i < ISKENDERUN_COASTLINE_POINTS.length - 1; i++) {
    const p1 = ISKENDERUN_COASTLINE_POINTS[i];
    const p2 = ISKENDERUN_COASTLINE_POINTS[i + 1];
    if (lat >= p1[0] && lat <= p2[0]) {
      const t = (lat - p1[0]) / (p2[0] - p1[0]);
      return p1[1] + t * (p2[1] - p1[1]);
    }
  }
  return null;
}

/**
 * Koordinat denize taşıyorsa kıyı çizgisine kenetler (clipping).
 * Altıgenin deniz tarafındaki kenarının tam olarak sahil şeridinde durmasını sağlar.
 */
export function clipCoordinateToLand(lat: number, lng: number): [number, number] {
  const coastLng = getIskenderunCoastlineLongitude(lat);
  if (coastLng !== null && lng < coastLng) {
    return [lat, coastLng]; // Kıyı sınırına kenetle
  }
  return [lat, lng];
}
