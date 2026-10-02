export interface GeocodingResult {
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
  importance?: number;
}

/**
 * OpenStreetMap Nominatim Geocoding API ile canlı adres ve yer arama.
 * Ücretsizdir, API anahtarı gerektirmez ve Türkiye sınırlarında yüksek doğruluk sağlar.
 */
export async function searchAddressOSM(
  query: string,
  cityContext?: string,
  limit: number = 5
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const searchQuery = cityContext && !query.toLowerCase().includes(cityContext.toLowerCase())
      ? `${query.trim()}, ${cityContext.trim()}, Türkiye`
      : `${query.trim()}, Türkiye`;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('countrycodes', 'tr');

    const res = await fetch(url.toString(), {
      headers: {
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
      }
    });

    if (!res.ok) {
      console.warn('Geocoding request failed with status:', res.status);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      importance: item.importance
    }));
  } catch (err) {
    console.error('Adres arama servisi hatası:', err);
    return [];
  }
}
