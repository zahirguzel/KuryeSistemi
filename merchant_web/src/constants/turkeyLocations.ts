export interface CityInfo {
  id: string; // e.g., '06' or 'ankara'
  plate: number;
  name: string;
  coords: [number, number]; // [lat, lng]
  zoom: number;
  districts: string[];
  quickHubs: QuickHub[];
}

export interface QuickHub {
  id: string;
  name: string;
  coords: [number, number];
  description?: string;
}

export interface FirmOperatingZone {
  cityId: string;
  cityName: string;
  district: string;
  coords: [number, number];
}

// 81 İl ve temel lojistik merkezleri
export const TURKEY_CITIES: CityInfo[] = [
  {
    id: '31',
    plate: 31,
    name: 'Hatay',
    coords: [36.5867, 36.1714], // İskenderun merkezli lojistik odağı
    zoom: 13,
    districts: [
      'İskenderun', 'Antakya', 'Defne', 'Arsuz', 'Belen', 'Dörtyol',
      'Payas', 'Kırıkhan', 'Reyhanlı', 'Samandağ', 'Erzin', 'Hassa', 'Altınözü', 'Kumlu', 'Yayladağı'
    ],
    quickHubs: [
      { id: 'isk_carsi', name: 'İskenderun Çarşı', coords: [36.5867, 36.1714], description: 'Merkez Ticari Bölge' },
      { id: 'isk_sahil', name: 'Karaağaç / Sahil', coords: [36.5620, 36.1360], description: 'Sahil & Kafe Hattı' },
      { id: 'isk_mkemal', name: 'Mustafa Kemal Mah.', coords: [36.5742, 36.1558], description: 'Yoğun Restoran Bölgesi' },
      { id: 'ant_merkez', name: 'Antakya Merkez', coords: [36.2023, 36.1606], description: 'Antakya Çarşı' },
      { id: 'ars_merkez', name: 'Arsuz Merkez', coords: [36.4172, 35.8856], description: 'Arsuz Marina & Sahil' },
      { id: 'dort_merkez', name: 'Dörtyol Çarşı', coords: [36.8580, 36.2230], description: 'Dörtyol Merkez' }
    ]
  },
  {
    id: '06',
    plate: 6,
    name: 'Ankara',
    coords: [39.9208, 32.8541], // Kızılay / Çankaya
    zoom: 13,
    districts: [
      'Çankaya', 'Yenimahalle', 'Keçiören', 'Mamak', 'Etimesgut', 'Sincan',
      'Altındağ', 'Gölbaşı', 'Pursaklar', 'Polatlı', 'Beypazarı', 'Akyurt', 'Kahramankazan', 'Çubuk'
    ],
    quickHubs: [
      { id: 'ank_kizilay', name: 'Kızılay / Çankaya', coords: [39.9208, 32.8541], description: 'Merkez & Restoranlar' },
      { id: 'ank_tunali', name: 'Tunalı / Kavaklıdere', coords: [39.9035, 32.8610], description: 'Yoğun Kafe & Gastronomi' },
      { id: 'ank_bahceli', name: 'Bahçelievler / 7. Cad.', coords: [39.9230, 32.8248], description: 'Öğrenci & Hızlı Yemek' },
      { id: 'ank_batikent', name: 'Batıkent / Atlantis', coords: [39.9678, 32.7485], description: 'Yenimahalle Ticaret' },
      { id: 'ank_cayyolu', name: 'Çayyolu / Park Cad.', coords: [39.8824, 32.6953], description: 'Lüks Gastronomi Hattı' },
      { id: 'ank_eryaman', name: 'Eryaman / Göksu', coords: [39.9880, 32.6280], description: 'Etimesgut Lojistik' }
    ]
  },
  {
    id: '34',
    plate: 34,
    name: 'İstanbul',
    coords: [41.0082, 28.9784],
    zoom: 12,
    districts: [
      'Kadıköy', 'Beşiktaş', 'Şişli', 'Bakırköy', 'Üsküdar', 'Ataşehir', 'Beyoğlu',
      'Fatih', 'Maltepe', 'Kartal', 'Pendik', 'Ümraniye', 'Sarıyer', 'Eyüpsultan',
      'Bahçelievler', 'Bağcılar', 'Esenyurt', 'Küçükçekmece', 'Başakşehir', 'Zeytinburnu'
    ],
    quickHubs: [
      { id: 'ist_kadikoy', name: 'Kadıköy Çarşı / Moda', coords: [40.9880, 29.0270], description: 'Anadolu Yakası Kalbi' },
      { id: 'ist_besiktas', name: 'Beşiktaş Çarşı / Akaretler', coords: [41.0428, 29.0077], description: 'Avrupa Yakası Merkez' },
      { id: 'ist_mecidiyekoy', name: 'Şişli / Mecidiyeköy', coords: [41.0637, 28.9922], description: 'İş & Ticaret Bölgesi' },
      { id: 'ist_atasehir', name: 'Ataşehir Batı / Finans', coords: [40.9925, 29.1170], description: 'Finans Merkezi' },
      { id: 'ist_bakirkoy', name: 'Bakırköy Meydan', coords: [40.9780, 28.8744], description: 'Sahil & Çarşı Hattı' }
    ]
  },
  {
    id: '35',
    plate: 35,
    name: 'İzmir',
    coords: [38.4237, 27.1428],
    zoom: 13,
    districts: [
      'Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Çiğli', 'Bayraklı',
      'Balçova', 'Gaziemir', 'Narlıdere', 'Karabağlar', 'Menemen', 'Torbalı', 'Urla', 'Çeşme'
    ],
    quickHubs: [
      { id: 'izm_alsancak', name: 'Alsancak / Kıbrıs Şehitleri', coords: [38.4382, 27.1424], description: 'Merkez Gastronomi' },
      { id: 'izm_karsiyaka', name: 'Karşıyaka Çarşı / Bostanlı', coords: [38.4593, 27.1120], description: 'Kuzey Aksı' },
      { id: 'izm_bornova', name: 'Bornova / Küçükpark', coords: [38.4635, 27.2170], description: 'Üniversite & Hızlı Paket' },
      { id: 'izm_buca', name: 'Buca / Hasanağa', coords: [38.3880, 27.1680], description: 'Yoğun Sipariş Hattı' }
    ]
  },
  {
    id: '01',
    plate: 1,
    name: 'Adana',
    coords: [36.9914, 35.3308],
    zoom: 13,
    districts: ['Seyhan', 'Çukurova', 'Yüreğir', 'Sarıçam', 'Ceyhan', 'Kozan', 'Karaisalı', 'Pozantı'],
    quickHubs: [
      { id: 'ada_gazipasa', name: 'Seyhan / Gazipaşa Bulv.', coords: [36.9990, 35.3230], description: 'Merkez & Restoranlar' },
      { id: 'ada_turgutozal', name: 'Çukurova / Turgut Özal Bulv.', coords: [37.0370, 35.2950], description: 'Yeni Şehir & Kafeler' },
      { id: 'ada_barajyolu', name: 'Seyhan / Barajyolu', coords: [37.0190, 35.3120], description: 'Hızlı Paket Bölgesi' }
    ]
  },
  {
    id: '07',
    plate: 7,
    name: 'Antalya',
    coords: [36.8969, 30.7133],
    zoom: 13,
    districts: ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Alanya', 'Manavgat', 'Serik', 'Kemer', 'Kaş'],
    quickHubs: [
      { id: 'ant_muratpasa', name: 'Muratpaşa / Işıklar', coords: [36.8833, 30.7056], description: 'Tarihi & Ticari Merkez' },
      { id: 'ant_konyaalti', name: 'Konyaaltı Kent Meydanı', coords: [36.8720, 30.6450], description: 'Sahil & Kafeler' },
      { id: 'ant_lara', name: 'Lara / Şirinyalı', coords: [36.8620, 30.7480], description: 'Yoğun Restoran Hattı' }
    ]
  },
  {
    id: '16',
    plate: 16,
    name: 'Bursa',
    coords: [40.1885, 29.0610],
    zoom: 13,
    districts: ['Nilüfer', 'Osmangazi', 'Yıldırım', 'Mudanya', 'Gemlik', 'İnegöl', 'Gürsu', 'Kestel'],
    quickHubs: [
      { id: 'bur_fsm', name: 'Nilüfer / FSM Bulvarı', coords: [40.2180, 28.9870], description: 'Restoran & Kafe Bölgesi' },
      { id: 'bur_ozluce', name: 'Nilüfer / Özlüce', coords: [40.2290, 28.9240], description: 'Yeni Yaşam & Yemek' },
      { id: 'bur_heykeli', name: 'Osmangazi / Heykel Çarşı', coords: [40.1830, 29.0630], description: 'Tarihi Merkez' }
    ]
  },
  {
    id: '27',
    plate: 27,
    name: 'Gaziantep',
    coords: [37.0662, 37.3833],
    zoom: 13,
    districts: ['Şahinbey', 'Şehitkamil', 'Oğuzeli', 'Nizip', 'İslahiye', 'Nurdağı', 'Araban', 'Yavuzeli'],
    quickHubs: [
      { id: 'gaz_ibrahimli', name: 'Şehitkamil / İbrahimli', coords: [37.0850, 37.3480], description: 'Gastronomi & Lüks Restoranlar' },
      { id: 'gaz_gazimuhtar', name: 'Şehitkamil / Gazi Muhtar Paşa', coords: [37.0720, 37.3710], description: 'Merkez Bulvar' },
      { id: 'gaz_karatas', name: 'Şahinbey / Karataş', coords: [37.0260, 37.3490], description: 'Yoğun Nüfus & Paket' }
    ]
  },
  {
    id: '42',
    plate: 42,
    name: 'Konya',
    coords: [37.8746, 32.4932],
    zoom: 13,
    districts: ['Selçuklu', 'Meram', 'Karatay', 'Ereğli', 'Akşehir', 'Beyşehir', 'Seydişehir', 'Çumra'],
    quickHubs: [
      { id: 'kon_selcuklu', name: 'Selçuklu / Bosna Hersek', coords: [38.0120, 32.5290], description: 'Öğrenci & Hızlı Paket' },
      { id: 'kon_zafer', name: 'Meram / Zafer Meydanı', coords: [37.8710, 32.4850], description: 'Şehir Merkezi' }
    ]
  },
  {
    id: '33',
    plate: 33,
    name: 'Mersin',
    coords: [36.8121, 34.6415],
    zoom: 13,
    districts: ['Yenişehir', 'Mezitli', 'Akdeniz', 'Toroslar', 'Tarsus', 'Erdemli', 'Silifke', 'Anamur'],
    quickHubs: [
      { id: 'mer_pozcu', name: 'Yenişehir / Pozcu (Kushimoto)', coords: [36.7860, 34.6050], description: 'Kafe & Restoran Kalbi' },
      { id: 'mer_marina', name: 'Yenişehir / Mersin Marina', coords: [36.7720, 34.5820], description: 'Sahil Restoranları' },
      { id: 'mer_mezitli', name: 'Mezitli / Viranşehir', coords: [36.7530, 34.5420], description: 'Sahil Hattı' }
    ]
  },
  {
    id: '26',
    plate: 26,
    name: 'Eskişehir',
    coords: [39.7767, 30.5206],
    zoom: 13,
    districts: ['Tepebaşı', 'Odunpazarı', 'Sivrihisar', 'Çifteler', 'Seyitgazi', 'Alpu', 'Mahmudiye'],
    quickHubs: [
      { id: 'esk_baglar', name: 'Tepebaşı / Bağlar & Üniversite', coords: [39.7850, 30.5090], description: 'Öğrenci & Hızlı Paket' },
      { id: 'esk_doktorlar', name: 'Tepebaşı / Doktorlar Cad.', coords: [39.7770, 30.5180], description: 'Merkez Çarşı' }
    ]
  },
  {
    id: '41',
    plate: 41,
    name: 'Kocaeli',
    coords: [40.7654, 29.9408],
    zoom: 13,
    districts: ['İzmit', 'Gebze', 'Darıca', 'Körfez', 'Gölcük', 'Derince', 'Çayırova', 'Kartepe', 'Başiskele'],
    quickHubs: [
      { id: 'koc_izmit', name: 'İzmit / Yürüyüş Yolu', coords: [40.7650, 29.9320], description: 'İzmit Merkez' },
      { id: 'koc_gebze', name: 'Gebze / Çarşı & Meydan', coords: [40.8030, 29.4310], description: 'Sanayi & Lojistik Kalbi' }
    ]
  },
  {
    id: '38',
    plate: 38,
    name: 'Kayseri',
    coords: [38.7205, 35.4826],
    zoom: 13,
    districts: ['Melikgazi', 'Kocasinan', 'Talas', 'Develi', 'Yahyalı', 'Bünyan', 'İncesu', 'Pınarbaşı'],
    quickHubs: [
      { id: 'kay_talas', name: 'Talas / Anayurt & Bahçelievler', coords: [38.6920, 35.5530], description: 'Kafe & Restoranlar' },
      { id: 'kay_meydan', name: 'Melikgazi / Cumhuriyet Meydanı', coords: [38.7220, 35.4860], description: 'Merkez Ticaret' }
    ]
  },
  {
    id: '21',
    plate: 21,
    name: 'Diyarbakır',
    coords: [37.9144, 40.2306],
    zoom: 13,
    districts: ['Kayapınar', 'Bağlar', 'Yenişehir', 'Sur', 'Bismil', 'Ergani', 'Silvan'],
    quickHubs: [
      { id: 'diy_diclekent', name: 'Kayapınar / Diclekent & 75 Yol', coords: [37.9470, 40.1770], description: 'Yeni Gastronomi Hattı' },
      { id: 'diy_ofis', name: 'Yenişehir / Ofis Semti', coords: [37.9180, 40.2180], description: 'Ticari Merkez' }
    ]
  },
  {
    id: '55',
    plate: 55,
    name: 'Samsun',
    coords: [41.2867, 36.33],
    zoom: 13,
    districts: ['Atakum', 'İlkadım', 'Canik', 'Tekkeköy', 'Bafra', 'Çarşamba', 'Havza', 'Vezirköprü'],
    quickHubs: [
      { id: 'sam_atakum', name: 'Atakum / Sahil & Türkiş', coords: [41.3320, 36.2750], description: 'Sahil Kafe & Yemek' },
      { id: 'sam_ciftlik', name: 'İlkadım / Çiftlik Caddesi', coords: [41.2880, 36.3350], description: 'Şehir Merkezi' }
    ]
  },
  {
    id: '61',
    plate: 61,
    name: 'Trabzon',
    coords: [41.0027, 39.7168],
    zoom: 13,
    districts: ['Ortahisar', 'Akçaabat', 'Yomra', 'Arsin', 'Of', 'Vakfıkebir', 'Sürmene', 'Beşikdüzü'],
    quickHubs: [
      { id: 'tra_meydan', name: 'Ortahisar / Trabzon Meydan', coords: [41.0060, 39.7270], description: 'Merkez Çarşı' },
      { id: 'tra_kalkinma', name: 'Ortahisar / Kalkınma & KTÜ', coords: [40.9980, 39.7610], description: 'Öğrenci & Hızlı Servis' }
    ]
  },
  {
    id: '10',
    plate: 10,
    name: 'Balıkesir',
    coords: [39.6484, 27.8826],
    zoom: 13,
    districts: ['Karesi', 'Altıeylül', 'Edremit', 'Bandırma', 'Ayvalık', 'Burhaniye', 'Gönen', 'Erdek'],
    quickHubs: [
      { id: 'bal_merkez', name: 'Karesi / Ali Hikmet Paşa', coords: [39.6510, 27.8860], description: 'Şehir Merkezi' },
      { id: 'bal_bandirma', name: 'Bandırma / İskele & Sahil', coords: [40.3520, 27.9740], description: 'Bandırma Çarşı' }
    ]
  },
  {
    id: '48',
    plate: 48,
    name: 'Muğla',
    coords: [37.2153, 28.3636],
    zoom: 12,
    districts: ['Bodrum', 'Fethiye', 'Marmaris', 'Menteşe', 'Milas', 'Ortaca', 'Dalaman', 'Datça'],
    quickHubs: [
      { id: 'mug_bodrum', name: 'Bodrum / Marina & Çarşı', coords: [37.0340, 27.4300], description: 'Turizm & Gastronomi' },
      { id: 'mug_fethiye', name: 'Fethiye / Kordon & Çarşı', coords: [36.6210, 29.1160], description: 'Fethiye Merkez' },
      { id: 'mug_marmaris', name: 'Marmaris / Marina', coords: [36.8520, 28.2710], description: 'Marmaris Merkez' }
    ]
  },
  {
    id: '54',
    plate: 54,
    name: 'Sakarya',
    coords: [40.7569, 30.3783],
    zoom: 13,
    districts: ['Adapazarı', 'Serdivan', 'Erenler', 'Arifiye', 'Akyazı', 'Hendek', 'Karasu', 'Sapanca'],
    quickHubs: [
      { id: 'sak_serdivan', name: 'Serdivan / Mavi Durak', coords: [40.7680, 30.3620], description: 'Kafe & Restoran Bölgesi' },
      { id: 'sak_adapazari', name: 'Adapazarı / Çark Caddesi', coords: [40.7760, 30.3950], description: 'Merkez Çarşı' }
    ]
  },
  {
    id: '20',
    plate: 20,
    name: 'Denizli',
    coords: [37.7765, 29.0864],
    zoom: 13,
    districts: ['Pamukkale', 'Merkezefendi', 'Çivril', 'Acıpayam', 'Tavas', 'Honaz', 'Sarayköy', 'Buldan'],
    quickHubs: [
      { id: 'den_camlik', name: 'Pamukkale / Çamlık Bulvarı', coords: [37.7550, 29.0970], description: 'Gastronomi & Kafeler' },
      { id: 'den_cinar', name: 'Merkezefendi / Çınar Meydanı', coords: [37.7780, 29.0830], description: 'Merkez Çarşı' }
    ]
  },
  {
    id: '59',
    plate: 59,
    name: 'Tekirdağ',
    coords: [40.9833, 27.5167],
    zoom: 13,
    districts: ['Süleymanpaşa', 'Çorlu', 'Çerkezköy', 'Kapaklı', 'Ergene', 'Malkara', 'Saray', 'Şarköy'],
    quickHubs: [
      { id: 'tek_corlu', name: 'Çorlu / Omurtak Caddesi', coords: [41.1590, 27.8000], description: 'Çorlu Ticaret & Yemek' },
      { id: 'tek_merkez', name: 'Süleymanpaşa / Sahil', coords: [40.9760, 27.5120], description: 'Tekirdağ Sahil' }
    ]
  }
];

// 81 ilin geri kalanını dinamik olarak tamamlayan kütük
const ALL_81_PROVINCES_NAMES: { plate: number; name: string; lat: number; lng: number }[] = [
  { plate: 1, name: 'Adana', lat: 36.9914, lng: 35.3308 },
  { plate: 2, name: 'Adıyaman', lat: 37.7648, lng: 38.2786 },
  { plate: 3, name: 'Afyonkarahisar', lat: 38.7507, lng: 30.5567 },
  { plate: 4, name: 'Ağrı', lat: 39.7191, lng: 43.0503 },
  { plate: 5, name: 'Amasya', lat: 40.6534, lng: 35.8331 },
  { plate: 6, name: 'Ankara', lat: 39.9208, lng: 32.8541 },
  { plate: 7, name: 'Antalya', lat: 36.8969, lng: 30.7133 },
  { plate: 8, name: 'Artvin', lat: 41.1828, lng: 41.8183 },
  { plate: 9, name: 'Aydın', lat: 37.8560, lng: 27.8416 },
  { plate: 10, name: 'Balıkesir', lat: 39.6484, lng: 27.8826 },
  { plate: 11, name: 'Bilecik', lat: 40.1419, lng: 29.9793 },
  { plate: 12, name: 'Bingöl', lat: 38.8853, lng: 40.4983 },
  { plate: 13, name: 'Bitlis', lat: 38.4006, lng: 42.1095 },
  { plate: 14, name: 'Bolu', lat: 40.7350, lng: 31.6061 },
  { plate: 15, name: 'Burdur', lat: 37.7203, lng: 30.2908 },
  { plate: 16, name: 'Bursa', lat: 40.1885, lng: 29.0610 },
  { plate: 17, name: 'Çanakkale', lat: 40.1553, lng: 26.4142 },
  { plate: 18, name: 'Çankırı', lat: 40.6013, lng: 33.6134 },
  { plate: 19, name: 'Çorum', lat: 40.5506, lng: 34.9556 },
  { plate: 20, name: 'Denizli', lat: 37.7765, lng: 29.0864 },
  { plate: 21, name: 'Diyarbakır', lat: 37.9144, lng: 40.2306 },
  { plate: 22, name: 'Edirne', lat: 41.6771, lng: 26.5557 },
  { plate: 23, name: 'Elazığ', lat: 38.6810, lng: 39.2264 },
  { plate: 24, name: 'Erzincan', lat: 39.7500, lng: 39.5000 },
  { plate: 25, name: 'Erzurum', lat: 39.9055, lng: 41.2658 },
  { plate: 26, name: 'Eskişehir', lat: 39.7767, lng: 30.5206 },
  { plate: 27, name: 'Gaziantep', lat: 37.0662, lng: 37.3833 },
  { plate: 28, name: 'Giresun', lat: 40.9128, lng: 38.3895 },
  { plate: 29, name: 'Gümüşhane', lat: 40.4600, lng: 39.4814 },
  { plate: 30, name: 'Hakkari', lat: 37.5833, lng: 43.7333 },
  { plate: 31, name: 'Hatay', lat: 36.5867, lng: 36.1714 },
  { plate: 32, name: 'Isparta', lat: 37.7648, lng: 30.5566 },
  { plate: 33, name: 'Mersin', lat: 36.8121, lng: 34.6415 },
  { plate: 34, name: 'İstanbul', lat: 41.0082, lng: 28.9784 },
  { plate: 35, name: 'İzmir', lat: 38.4237, lng: 27.1428 },
  { plate: 36, name: 'Kars', lat: 40.6167, lng: 43.1000 },
  { plate: 37, name: 'Kastamonu', lat: 41.3887, lng: 33.7827 },
  { plate: 38, name: 'Kayseri', lat: 38.7205, lng: 35.4826 },
  { plate: 39, name: 'Kırklareli', lat: 41.7333, lng: 27.2167 },
  { plate: 40, name: 'Kırşehir', lat: 39.1425, lng: 34.1709 },
  { plate: 41, name: 'Kocaeli', lat: 40.7654, lng: 29.9408 },
  { plate: 42, name: 'Konya', lat: 37.8746, lng: 32.4932 },
  { plate: 43, name: 'Kütahya', lat: 39.4167, lng: 29.9833 },
  { plate: 44, name: 'Malatya', lat: 38.3552, lng: 38.3095 },
  { plate: 45, name: 'Manisa', lat: 38.6191, lng: 27.4289 },
  { plate: 46, name: 'Kahramanmaraş', lat: 37.5858, lng: 36.9371 },
  { plate: 47, name: 'Mardin', lat: 37.3212, lng: 40.7245 },
  { plate: 48, name: 'Muğla', lat: 37.2153, lng: 28.3636 },
  { plate: 49, name: 'Muş', lat: 38.7432, lng: 41.5064 },
  { plate: 50, name: 'Nevşehir', lat: 38.6244, lng: 34.7142 },
  { plate: 51, name: 'Niğde', lat: 37.9667, lng: 34.6833 },
  { plate: 52, name: 'Ordu', lat: 40.9839, lng: 37.8764 },
  { plate: 53, name: 'Rize', lat: 41.0201, lng: 40.5234 },
  { plate: 54, name: 'Sakarya', lat: 40.7569, lng: 30.3783 },
  { plate: 55, name: 'Samsun', lat: 41.2867, lng: 36.3300 },
  { plate: 56, name: 'Siirt', lat: 37.9333, lng: 41.9500 },
  { plate: 57, name: 'Sinop', lat: 42.0231, lng: 35.1531 },
  { plate: 58, name: 'Sivas', lat: 39.7477, lng: 37.0179 },
  { plate: 59, name: 'Tekirdağ', lat: 40.9833, lng: 27.5167 },
  { plate: 60, name: 'Tokat', lat: 40.3167, lng: 36.5500 },
  { plate: 61, name: 'Trabzon', lat: 41.0027, lng: 39.7168 },
  { plate: 62, name: 'Tunceli', lat: 39.1079, lng: 39.5401 },
  { plate: 63, name: 'Şanlıurfa', lat: 37.1674, lng: 38.7955 },
  { plate: 64, name: 'Uşak', lat: 38.6823, lng: 29.4082 },
  { plate: 65, name: 'Van', lat: 38.4891, lng: 43.4089 },
  { plate: 66, name: 'Yozgat', lat: 39.8181, lng: 34.8147 },
  { plate: 67, name: 'Zonguldak', lat: 41.4564, lng: 31.7987 },
  { plate: 68, name: 'Aksaray', lat: 38.3687, lng: 34.0370 },
  { plate: 69, name: 'Bayburt', lat: 40.2552, lng: 40.2249 },
  { plate: 70, name: 'Karaman', lat: 37.1759, lng: 33.2287 },
  { plate: 71, name: 'Kırıkkale', lat: 39.8468, lng: 33.5153 },
  { plate: 72, name: 'Batman', lat: 37.8812, lng: 41.1293 },
  { plate: 73, name: 'Şırnak', lat: 37.5164, lng: 42.4594 },
  { plate: 74, name: 'Bartın', lat: 41.6344, lng: 32.3375 },
  { plate: 75, name: 'Ardahan', lat: 41.1105, lng: 42.7022 },
  { plate: 76, name: 'Iğdır', lat: 39.9196, lng: 44.0454 },
  { plate: 77, name: 'Yalova', lat: 40.6550, lng: 29.2769 },
  { plate: 78, name: 'Karabük', lat: 41.2061, lng: 32.6204 },
  { plate: 79, name: 'Kilis', lat: 36.7184, lng: 37.1212 },
  { plate: 80, name: 'Osmaniye', lat: 37.0742, lng: 36.2472 },
  { plate: 81, name: 'Düzce', lat: 40.8438, lng: 31.1565 },
];

// 81 ilin tamamını birleştiren eksiksiz liste
export const ALL_TURKEY_CITIES: CityInfo[] = ALL_81_PROVINCES_NAMES.map((prov) => {
  const existing = TURKEY_CITIES.find((c) => c.plate === prov.plate);
  if (existing) return existing;
  return {
    id: String(prov.plate).padStart(2, '0'),
    plate: prov.plate,
    name: prov.name,
    coords: [prov.lat, prov.lng] as [number, number],
    zoom: 13,
    districts: [
      `${prov.name} Merkez`,
      'Kuzey Bölgesi',
      'Güney Bölgesi',
      'Çarşı / Sanayi',
      'Üniversite / Kampüs'
    ],
    quickHubs: [
      {
        id: `${prov.plate}_merkez`,
        name: `${prov.name} Şehir Merkezi`,
        coords: [prov.lat, prov.lng] as [number, number],
        description: 'Merkez Ticari Bölge'
      }
    ]
  };
}).sort((a, b) => a.plate - b.plate);

// LocalStorage anahtarı
const STORAGE_KEY = 'kurye_firm_operating_zone';

// Varsayılan operasyon bölgesi (Hatay / İskenderun)
export const DEFAULT_OPERATING_ZONE: FirmOperatingZone = {
  cityId: '31',
  cityName: 'Hatay',
  district: 'İskenderun',
  coords: [36.5867, 36.1714]
};

// Firmanın aktif çalışma bölgesini okuma
export function getFirmOperatingZone(): FirmOperatingZone {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.cityId && parsed.cityName && parsed.coords) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Operasyon bölgesi okunamadı, varsayılana dönülüyor:', e);
  }
  return DEFAULT_OPERATING_ZONE;
}

// Firmanın aktif çalışma bölgesini kaydetme
export function setFirmOperatingZone(zone: Partial<FirmOperatingZone>): FirmOperatingZone {
  const current = getFirmOperatingZone();
  const updated: FirmOperatingZone = {
    ...current,
    ...zone
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Tarayıcı içi diğer sekmeleri / bileşenleri bilgilendirmek için özel event tetikle
    window.dispatchEvent(new CustomEvent('firmOperatingZoneChanged', { detail: updated }));
  } catch (e) {
    console.error('Operasyon bölgesi kaydedilemedi:', e);
  }
  return updated;
}

// Şehir adına veya plakasına göre şehir bilgisi bulma
export function findCity(query: string | number): CityInfo | undefined {
  if (typeof query === 'number') {
    return ALL_TURKEY_CITIES.find(c => c.plate === query);
  }
  const clean = query.trim().toLowerCase();
  return ALL_TURKEY_CITIES.find(
    c => c.id.toLowerCase() === clean || c.name.toLowerCase() === clean || String(c.plate) === clean
  );
}
