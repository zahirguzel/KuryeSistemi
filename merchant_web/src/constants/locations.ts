import {
  getDistrictsByCityCode,
  getNeighbourhoodsByCityCodeAndDistrict,
  getCityNames,
  getCityCodes,
} from 'turkey-neighbourhoods';

import {
  ALL_TURKEY_CITIES,
  findCity,
  getFirmOperatingZone,
  setFirmOperatingZone,
  type CityInfo,
  type FirmOperatingZone,
  type QuickHub
} from './turkeyLocations';

export interface DistrictNeighborhoods {
  [district: string]: string[];
}

// Geriye dönük uyumluluk ve hızlı erişim için Hatay / İskenderun temel listesi
export const DISTRICT_NEIGHBORHOODS: DistrictNeighborhoods = {
  'İskenderun': [
    'Atatürk Mah.',
    'Barıştepe Mah.',
    'Buluttepe Mah.',
    'Cumhuriyet Mah.',
    'Çamlık Mah.',
    'Çay Mah.',
    'Denizciler Mah.',
    'Dumlupınar Mah.',
    'Esentepe Mah.',
    'Fatih Sultan Mehmet Mah.',
    'Gürsel Mah.',
    'Hürriyet Mah.',
    'İsmet İnönü Mah.',
    'Karaağaç Mah.',
    'Karayılan Mah.',
    'Kocatepe Mah.',
    'Kurtuluş Mah.',
    'Meydan Mah.',
    'Modern Evler Mah.',
    'Muradiye Mah.',
    'Mustafa Kemal Mah.',
    'Numune Mah.',
    'Pınarbaşı Mah.',
    'Pirireis Mah.',
    'Sakarya Mah.',
    'Savaş Mah.',
    'Süleymaniye Mah.',
    'Yunus Emre Mah.',
  ],
  'Arsuz': [
    'Arsuz Merkez Mah.',
    'Akçalı Mah.',
    'Gökmeydan Mah.',
    'Gözcüler Mah.',
    'Karaağaç Mah.',
    'Madenli Mah.',
    'Uluçınar Mah.',
    'Üçgüllük Mah.',
  ],
  'Belen': [
    'Belen Merkez Mah.',
    'Bakras Mah.',
    'Derebahçe Mah.',
    'Halilbey Mah.',
    'İssume Mah.',
    'Sarımazı Mah.',
  ],
  'Dörtyol': [
    'Numuneevler Mah.',
    'Sanayi Mah.',
    'Kışlalar Mah.',
    'Yeşil Mah.',
    'Özerli Mah.',
    'Altınçağ Mah.',
    'Yeniyurt Mah.',
  ],
};

// Geriye dönük uyumluluk için varsayılan ilçeler
export const DISTRICTS = Object.keys(DISTRICT_NEIGHBORHOODS);

/**
 * Şehir plaka kodunu belirler (Örn: '06', 'Ankara' veya 6 -> '06')
 */
export function resolveCityCode(cityNameOrId: string | number): string {
  if (typeof cityNameOrId === 'number') {
    return String(cityNameOrId).padStart(2, '0');
  }
  const clean = cityNameOrId.trim();
  if (/^\d+$/.test(clean)) {
    return clean.padStart(2, '0');
  }
  const city = findCity(clean);
  if (city) {
    return String(city.plate).padStart(2, '0');
  }
  // Varsayılan Hatay
  return '31';
}

/**
 * Bir ilin tüm resmi ilçelerini eksiksiz getirir (turkey-neighbourhoods kütüphanesinden)
 */
export function getDistrictsForCity(cityNameOrId: string | number): string[] {
  try {
    const code = resolveCityCode(cityNameOrId);
    const districts = getDistrictsByCityCode(code);
    if (districts && districts.length > 0) {
      return districts;
    }
  } catch (e) {
    console.warn('turkey-neighbourhoods ilçe okuma hatası:', e);
  }

  // Fallback
  const city = findCity(String(cityNameOrId));
  if (city && city.districts.length > 0) {
    return city.districts;
  }
  return DISTRICTS;
}

/**
 * Bir ilçe ve ilin TÜM resmi mahallelerini eksiksiz getirir (turkey-neighbourhoods kütüphanesinden)
 */
export function getNeighborhoodsForDistrict(
  districtName: string,
  cityNameOrId?: string | number
): string[] {
  if (!districtName) return [];

  try {
    // 1. Şehir kodu verilmişse doğrudan onu kullan
    let cityCode = cityNameOrId ? resolveCityCode(cityNameOrId) : '';

    // 2. Şehir kodu yoksa aktif firmanın operasyon bölgesini al
    if (!cityCode) {
      const activeZone = getFirmOperatingZone();
      cityCode = resolveCityCode(activeZone.cityId || activeZone.cityName);
    }

    if (cityCode) {
      const list = getNeighbourhoodsByCityCodeAndDistrict(cityCode, districtName);
      if (list && list.length > 0) {
        return list;
      }
    }
  } catch (e) {
    console.warn('turkey-neighbourhoods mahalle okuma hatası:', e);
  }

  // 3. Statik tanımlı listede var mı bak
  if (DISTRICT_NEIGHBORHOODS[districtName]) {
    return DISTRICT_NEIGHBORHOODS[districtName];
  }

  // 4. Bulunamadıysa jenerik merkez mahalleler sun
  return [
    `${districtName} Merkez Mah.`,
    'Cumhuriyet Mah.',
    'Atatürk Mah.',
    'Fatih Mah.',
    'İnönü Mah.',
    'Yeni Mahalle',
    'Çarşı Mah.',
    'Sanayi Mah.'
  ];
}

// Dışa aktarımlar
export {
  ALL_TURKEY_CITIES,
  findCity,
  getFirmOperatingZone,
  setFirmOperatingZone,
  getCityNames,
  getCityCodes,
  type CityInfo,
  type FirmOperatingZone,
  type QuickHub
};
