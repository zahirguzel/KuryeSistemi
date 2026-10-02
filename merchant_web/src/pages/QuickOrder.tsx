import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Send,
  User,
  Phone,
  MapPin,
  Banknote,
  CreditCard,
  Globe,
  FileText,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Upload,
  Package,
  Download,
  Search,
  Tag,
  ChevronRight,
  X,
  Layers,
} from 'lucide-react';
import type { PaymentMethod } from '../types';
import {
  getDistrictsForCity,
  getNeighborhoodsForDistrict,
  getFirmOperatingZone,
  type FirmOperatingZone,
} from '../constants/locations';
import { orderService } from '../services/orderService';
import { productService, type Product } from '../services/productService';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';

// ─── Demo ürünler (backend boşken gösterilir) ─────────────────────────────────

const DEMO_PRODUCTS: Product[] = [
  { id: 'd1', merchantId: '', name: 'Adana Kebap', category: 'Ana Yemekler', price: 180, isAvailable: true, displayOrder: 0 },
  { id: 'd2', merchantId: '', name: 'Urfa Kebap', category: 'Ana Yemekler', price: 175, isAvailable: true, displayOrder: 1 },
  { id: 'd3', merchantId: '', name: 'Tavuk Döner', category: 'Ana Yemekler', price: 140, isAvailable: true, displayOrder: 2 },
  { id: 'd4', merchantId: '', name: 'Lahmacun (2 Adet)', category: 'Ana Yemekler', price: 90, isAvailable: true, displayOrder: 3 },
  { id: 'd5', merchantId: '', name: 'Çay', category: 'İçecekler', price: 10, isAvailable: true, displayOrder: 0 },
  { id: 'd6', merchantId: '', name: 'Ayran', category: 'İçecekler', price: 15, isAvailable: true, displayOrder: 1 },
  { id: 'd7', merchantId: '', name: 'Kola (Küçük)', category: 'İçecekler', price: 25, isAvailable: true, displayOrder: 2 },
  { id: 'd8', merchantId: '', name: 'Limonata', category: 'İçecekler', price: 30, isAvailable: true, displayOrder: 3 },
  { id: 'd9', merchantId: '', name: 'Baklava (1 Dilim)', category: 'Tatlılar', price: 45, isAvailable: true, displayOrder: 0 },
  { id: 'd10', merchantId: '', name: 'Künefe', category: 'Tatlılar', price: 55, isAvailable: true, displayOrder: 1 },
  { id: 'd11', merchantId: '', name: 'Sütlaç', category: 'Tatlılar', price: 35, isAvailable: true, displayOrder: 2 },
  { id: 'd12', merchantId: '', name: 'Çiğ Börek', category: 'Atıştırmalık', price: 25, isAvailable: true, displayOrder: 0 },
  { id: 'd13', merchantId: '', name: 'Pide (Peynirli)', category: 'Atıştırmalık', price: 60, isAvailable: true, displayOrder: 1 },
  { id: 'd14', merchantId: '', name: 'Sigara Böreği (5 Adet)', category: 'Atıştırmalık', price: 40, isAvailable: true, displayOrder: 2 },
  { id: 'd15', merchantId: '', name: 'Salata (Mevsim)', category: 'Yan Ürünler', price: 50, isAvailable: true, displayOrder: 0 },
  { id: 'd16', merchantId: '', name: 'Pilav', category: 'Yan Ürünler', price: 30, isAvailable: true, displayOrder: 1 },
];

// ─── Kategori renk paleti ─────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Ana Yemekler': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', dot: '#f59e0b' },
  'İçecekler':    { bg: '#dbeafe', text: '#1e3a5f', border: '#93c5fd', dot: '#3b82f6' },
  'Tatlılar':     { bg: '#fce7f3', text: '#831843', border: '#f9a8d4', dot: '#ec4899' },
  'Atıştırmalık': { bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7', dot: '#10b981' },
  'Yan Ürünler':  { bg: '#ede9fe', text: '#4c1d95', border: '#c4b5fd', dot: '#8b5cf6' },
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? { bg: '#f8fafc', text: '#334155', border: '#e2e8f0', dot: '#64748b' };
}

// ─── Sepet tipi ───────────────────────────────────────────────────────────────

interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
}

// ─── Excel import satır tipi ──────────────────────────────────────────────────

interface ExcelRow {
  name: string;
  category: string;
  price: number;
  description?: string;
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

export const QuickOrder: React.FC = () => {
  const { merchant } = useAuthStore();
  const [operatingZone] = useState<FirmOperatingZone>(getFirmOperatingZone());
  const activeCityDistricts = getDistrictsForCity(operatingZone.cityName || operatingZone.cityId);

  // ── Görünüm sekmesi
  const [activeTab, setActiveTab] = useState<'pos' | 'products'>('pos');

  // ── POS: Müşteri bilgileri
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [district, setDistrict] = useState(
    activeCityDistricts.includes(operatingZone.district)
      ? operatingZone.district
      : activeCityDistricts[0] || 'İskenderun',
  );
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [buildingNo, setBuildingNo] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');

  // ── POS: Ürün verisi
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [productSearch, setProductSearch] = useState('');

  // ── Sepet & Hızlı Tutar
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customAmount, setCustomAmount] = useState('');

  // ── Sipariş durumu
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Ürün Yönetimi (Products sekmesi)
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ isAvailable: true, displayOrder: 0 });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // ── Excel Import
  const [excelPreview, setExcelPreview] = useState<ExcelRow[] | null>(null);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelSuccess, setExcelSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Ürün yükle
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await productService.getProducts();
      if (res.isSuccess && res.data && res.data.length > 0) {
        setProducts(res.data);
      } else {
        // Demo ürünleri göster
        setProducts(DEMO_PRODUCTS);
      }
    } catch {
      setProducts(DEMO_PRODUCTS);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ── Hesaplamalar
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category))).sort();
    return ['Tümü', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.isAvailable);
    if (selectedCategory !== 'Tümü') list = list.filter(p => p.category === selectedCategory);
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, selectedCategory, productSearch]);

  const cartTotal = useMemo(() => cart.reduce((s, item) => s + item.product.price * item.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, item) => s + item.quantity, 0), [cart]);

  // ── Sepet işlemleri
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty <= 0 ? null! : { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  // ── Adres auto-fill
  const autoFillAddress = (nd: string, nn: string, ns: string, nb: string) => {
    const parts: string[] = [];
    if (nn) parts.push(nn);
    if (ns) parts.push(ns.endsWith('Sok.') || ns.endsWith('Cad.') ? ns : `${ns} Sok.`);
    if (nb) parts.push(`No: ${nb}`);
    if (nd) parts.push(nd);
    if (parts.length > 0) setDeliveryAddress(parts.join(', '));
  };

  // ── Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!recipientName.trim()) { setErrorMessage('Alıcı adını giriniz.'); return; }
    if (!recipientPhone.trim()) { setErrorMessage('İletişim telefonunu giriniz.'); return; }
    if (!deliveryAddress.trim() && !neighborhood.trim()) { setErrorMessage('Teslimat adresi giriniz.'); return; }

    const finalAddress = deliveryAddress.trim() || `${neighborhood} ${street} No: ${buildingNo}, ${district}`;

    const parsedCustom = parseFloat(customAmount.replace(',', '.')) || 0;
    const effectiveTotal = cartTotal > 0 ? cartTotal : parsedCustom;

    if (paymentMethod !== 'Online' && effectiveTotal <= 0) {
      setErrorMessage('Sepete ürün ekleyin veya geçerli bir sipariş tutarı girin.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await orderService.createOrder({
        pickupAddressLine: merchant?.address || undefined,
        pickupLatitude: merchant?.latitude,
        pickupLongitude: merchant?.longitude,
        deliveryAddressLine: finalAddress,
        deliveryDistrict: district || 'İskenderun',
        deliveryCity: 'Hatay',
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        notes: notes.trim() || undefined,
        paymentMethod,
        totalOrderAmount: effectiveTotal > 0 ? effectiveTotal : 0,
      });

      if (response.isSuccess) {
        setSuccessMessage(`Sipariş kuryelere iletildi! Toplam: ${effectiveTotal.toFixed(2)} ₺`);
        setTimeout(() => setSuccessMessage(null), 6000);

        useNotificationStore.getState().addNotification({
          type: 'new_order',
          title: '🚀 Yeni Sipariş Oluşturuldu',
          message: `#${recipientName.trim()} adına ${effectiveTotal.toFixed(2)} ₺ tutarındaki sipariş kuryelere iletildi.`,
        });

        // Sıfırla
        setRecipientName(''); setRecipientPhone(''); setNeighborhood('');
        setStreet(''); setBuildingNo(''); setDeliveryAddress('');
        setNotes(''); setPaymentMethod('Cash'); setCart([]); setCustomAmount('');
      } else {
        let err = response.message || 'Sipariş oluşturulamadı.';
        if (Array.isArray(response.errors) && response.errors.length > 0) err += ` (${response.errors.join(', ')})`;
        setErrorMessage(err);
      }
    } catch {
      setErrorMessage('Sunucu ile iletişim hatası.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setRecipientName(''); setRecipientPhone(''); setNeighborhood('');
    setStreet(''); setBuildingNo(''); setDeliveryAddress('');
    setNotes(''); setPaymentMethod('Cash'); setCart([]); setCustomAmount('');
    setErrorMessage(null); setSuccessMessage(null);
  };

  // ── Ürün ekleme (Products sekmesi)
  const handleAddProduct = async () => {
    if (!newProduct.name?.trim()) { setAddError('Ürün adı gerekli.'); return; }
    if (!newProduct.category?.trim()) { setAddError('Kategori gerekli.'); return; }
    if (!newProduct.price || newProduct.price <= 0) { setAddError('Geçerli fiyat giriniz.'); return; }

    setAddLoading(true);
    setAddError(null);
    try {
      const res = await productService.createProduct({
        name: newProduct.name!.trim(),
        category: newProduct.category!.trim(),
        price: newProduct.price!,
        description: newProduct.description?.trim(),
        isAvailable: newProduct.isAvailable ?? true,
        displayOrder: newProduct.displayOrder ?? 0,
      });
      if (res.isSuccess) {
        setAddSuccess('Ürün başarıyla eklendi!');
        setTimeout(() => setAddSuccess(null), 3000);
        setNewProduct({ isAvailable: true, displayOrder: 0 });
        await loadProducts();
      } else {
        setAddError(res.message || 'Ürün eklenemedi.');
      }
    } catch {
      setAddError('Sunucu hatası.');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Excel parse
  const handleExcelFile = (file: File) => {
    setExcelError(null);
    setExcelSuccess(null);
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' });

        const parsed: ExcelRow[] = rows.map(row => ({
          name: String(row['Ad'] ?? row['Name'] ?? row['Ürün Adı'] ?? '').trim(),
          category: String(row['Kategori'] ?? row['Category'] ?? '').trim(),
          price: parseFloat(String(row['Fiyat'] ?? row['Price'] ?? '0').replace(',', '.')) || 0,
          description: String(row['Açıklama'] ?? row['Description'] ?? '').trim() || undefined,
        })).filter(r => r.name && r.category && r.price > 0);

        if (parsed.length === 0) {
          setExcelError('Dosyada geçerli ürün satırı bulunamadı. Beklenen sütunlar: Ad, Kategori, Fiyat');
          return;
        }
        setExcelPreview(parsed);
      } catch (err) {
        setExcelError('Excel dosyası okunamadı. Lütfen geçerli bir .xlsx dosyası seçin.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelUpload = async () => {
    if (!excelPreview || excelPreview.length === 0) return;
    setExcelUploading(true);
    setExcelError(null);
    try {
      const res = await productService.bulkCreateProducts({ products: excelPreview });
      if (res.isSuccess) {
        setExcelSuccess(`${excelPreview.length} ürün başarıyla yüklendi!`);
        setExcelPreview(null);
        setExcelFileName(null);
        await loadProducts();
      } else {
        setExcelError(res.message || 'Yükleme başarısız.');
      }
    } catch {
      setExcelError('Sunucu hatası.');
    } finally {
      setExcelUploading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Ad', 'Kategori', 'Fiyat', 'Açıklama'],
      ['Adana Kebap', 'Ana Yemekler', 180, ''],
      ['Çay', 'İçecekler', 10, ''],
      ['Baklava', 'Tatlılar', 45, '1 dilim'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
    XLSX.writeFile(wb, 'urun_sablonu.xlsx');
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-slate-50">

      {/* ── Sekme Bar ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'pos'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>POS / Hızlı Sipariş</span>
            {cartCount > 0 && (
              <span className="ml-1 bg-white text-amber-600 font-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-slate-800 text-white shadow-md shadow-slate-800/30'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Menü & Ürünler</span>
            <span className="ml-1 bg-slate-200 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {products.length}
            </span>
          </button>
        </div>
        <p className="text-xs text-slate-400 hidden sm:block">
          Telefonla veya tezgahtan gelen siparişleri anında kuryelere iletin
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* POS SEKMESI                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pos' && (
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 112px)' }}>

          {/* ── Sol: Kategoriler + Ürünler ────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">

            {/* Kategori Sidebar */}
            <div className="w-36 bg-white border-r border-slate-200 flex flex-col py-2 overflow-y-auto shrink-0">
              {categories.map(cat => {
                const col = getCategoryColor(cat);
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`relative text-left px-3 py-3 mx-2 mb-1 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'shadow-sm' : 'hover:bg-slate-50'
                    }`}
                    style={isActive
                      ? { background: col.bg, color: col.text, border: `1.5px solid ${col.border}` }
                      : { color: '#64748b', border: '1.5px solid transparent' }
                    }
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                        style={{ background: col.dot }}
                      />
                    )}
                    <span className="block leading-tight">{cat}</span>
                    {cat !== 'Tümü' && (
                      <span className="text-[10px] font-normal mt-0.5 block opacity-70">
                        {products.filter(p => p.category === cat && p.isAvailable).length} ürün
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Ürün Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Arama */}
              <div className="px-3 py-2 bg-white border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ürün ara..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Ürünler */}
              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 content-start">
                {productsLoading && (
                  <div className="col-span-full py-12 text-center text-sm text-slate-400">Ürünler yükleniyor...</div>
                )}
                {!productsLoading && filteredProducts.length === 0 && (
                  <div className="col-span-full py-12 text-center text-sm text-slate-400">Bu kategoride ürün yok</div>
                )}
                {filteredProducts.map(product => {
                  const col = getCategoryColor(product.category);
                  const inCart = cart.find(i => i.product.id === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`relative flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left hover:shadow-md active:scale-95 ${
                        inCart
                          ? 'border-amber-400 bg-amber-50 shadow-sm shadow-amber-100'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Kategori dot */}
                      <span className="w-2 h-2 rounded-full mb-2" style={{ background: col.dot }} />
                      <p className="text-xs font-bold text-slate-800 leading-tight mb-1">{product.name}</p>
                      <p className="text-sm font-black" style={{ color: col.dot }}>{product.price.toFixed(0)} ₺</p>

                      {/* Sepetteki adet rozeti */}
                      {inCart && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Sağ: Adisyon Sepeti + Form ────────────────────────────────── */}
          <div className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
            {/* Sepet başlığı */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-800">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white">Adisyon Sepeti</span>
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-slate-400 hover:text-rose-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Kaydırılabilir sepet içeriği */}
            <div className="flex-1 overflow-y-auto">
              {/* Bildirimler */}
              {successMessage && (
                <div className="m-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold text-emerald-700">{successMessage}</p>
                </div>
              )}
              {errorMessage && (
                <div className="m-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold text-rose-700">{errorMessage}</p>
                </div>
              )}

              {/* Sepet boş */}
              {cart.length === 0 && (
                <div className="py-10 flex flex-col items-center text-slate-300">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium text-slate-400">Sepet boş</p>
                  <p className="text-xs text-slate-300 mt-0.5">Ürüne tıklayarak ekleyin</p>
                </div>
              )}

              {/* Sepet kalemleri */}
              {cart.length > 0 && (
                <div className="px-3 pt-3 space-y-1.5">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center space-x-2 py-2 px-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 leading-tight truncate">{item.product.name}</p>
                        <p className="text-[11px] text-slate-500">{item.product.price.toFixed(2)} ₺</p>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => updateQty(item.product.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-500 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-black text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.product.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-6 h-6 rounded-lg text-slate-300 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-xs font-black text-slate-700 w-14 text-right shrink-0">
                        {(item.product.price * item.quantity).toFixed(2)} ₺
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Toplam */}
              {cart.length > 0 ? (
                <div className="mx-3 mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Toplam ({cartCount} ürün)</span>
                  <span className="text-base font-black text-slate-900">{cartTotal.toFixed(2)} ₺</span>
                </div>
              ) : (
                <div className="mx-3 mt-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 space-y-1">
                  <label className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                    <span>Hızlı Paket Tutarı</span>
                    <span className="text-[10px] text-amber-700 font-medium">Sepetsiz Giriş</span>
                  </label>
                  <div className="relative">
                    <Banknote className="w-4 h-4 text-amber-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Tutar girin (örn: 250)"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 text-xs font-bold bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-amber-800">₺</span>
                  </div>
                </div>
              )}

              {/* ── Müşteri Formu ───────────────────────────────────────── */}
              <form onSubmit={handleSubmit} className="px-3 pt-3 pb-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Müşteri & Adres</p>

                {/* Ad */}
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    placeholder="Alıcı adı soyadı *"
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-slate-50"
                  />
                </div>

                {/* Telefon */}
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={e => setRecipientPhone(e.target.value)}
                    placeholder="05XX XXX XX XX *"
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-slate-50"
                  />
                </div>

                {/* İlçe + Mahalle */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={district}
                    onChange={e => {
                      setDistrict(e.target.value);
                      setNeighborhood('');
                      autoFillAddress(e.target.value, '', street, buildingNo);
                    }}
                    className="w-full text-xs border border-slate-200 rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50 text-slate-700 font-medium"
                  >
                    {activeCityDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    value={neighborhood}
                    onChange={e => {
                      setNeighborhood(e.target.value);
                      autoFillAddress(district, e.target.value, street, buildingNo);
                    }}
                    className="w-full text-xs border border-slate-200 rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50 text-slate-700 font-medium"
                  >
                    <option value="">Mahalle *</option>
                    {getNeighborhoodsForDistrict(district, operatingZone.cityId).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Sokak + Bina */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={street}
                    onChange={e => {
                      setStreet(e.target.value);
                      autoFillAddress(district, neighborhood, e.target.value, buildingNo);
                    }}
                    placeholder="Sokak / Cadde"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50 text-slate-700"
                  />
                  <input
                    type="text"
                    value={buildingNo}
                    onChange={e => {
                      setBuildingNo(e.target.value);
                      autoFillAddress(district, neighborhood, street, e.target.value);
                    }}
                    placeholder="Bina / Kapı No"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50 text-slate-700"
                  />
                </div>

                {/* Açık adres */}
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Açık adres / kurye tarifi *"
                    className="w-full pl-8 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-slate-50 resize-none"
                  />
                </div>

                {/* Ödeme Yöntemi */}
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: 'Cash', label: 'Nakit', icon: Banknote },
                    { value: 'CreditCardOnDelivery', label: 'Kart', icon: CreditCard },
                    { value: 'Online', label: 'Online', icon: Globe },
                  ] as const).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all text-xs font-bold ${
                        paymentMethod === value
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-0.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Not */}
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Kurye notu (isteğe bağlı)"
                    className="w-full pl-8 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50"
                  />
                </div>

                {/* Butonlar */}
                <div className="flex space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs flex items-center justify-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Temizle</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-amber-500/30 flex items-center justify-center space-x-1 transition-all active:scale-95"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {(cartTotal > 0 ? cartTotal : (parseFloat(customAmount) || 0)) > 0
                            ? `${(cartTotal > 0 ? cartTotal : (parseFloat(customAmount) || 0)).toFixed(0)} ₺ — `
                            : ''}Siparişi Gönder
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ÜRÜN YÖNETİMİ SEKMESI                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">

          {/* ── Üst bar: Özet ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-2xl font-black text-slate-900">{products.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Toplam Ürün</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-2xl font-black text-emerald-600">{products.filter(p => p.isAvailable).length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Aktif</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-2xl font-black text-slate-900">{categories.length - 1}</p>
              <p className="text-xs text-slate-500 mt-0.5">Kategori</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-2xl font-black text-amber-600">
                {products.length > 0 ? (products.reduce((s, p) => s + p.price, 0) / products.length).toFixed(0) : 0} ₺
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Ort. Fiyat</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

            {/* ── Sol: Ürün Ekle + Excel Import ─────────────────────────── */}
            <div className="space-y-4">

              {/* Ürün Ekle */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-emerald-500" />
                  <span>Yeni Ürün Ekle</span>
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Ürün adı *"
                    value={newProduct.name ?? ''}
                    onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                  />
                  <input
                    type="text"
                    placeholder="Kategori (örn: Ana Yemekler) *"
                    value={newProduct.category ?? ''}
                    onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                    list="existing-categories"
                  />
                  <datalist id="existing-categories">
                    {categories.filter(c => c !== 'Tümü').map(c => <option key={c} value={c} />)}
                  </datalist>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₺</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Fiyat *"
                      value={newProduct.price ?? ''}
                      onChange={e => setNewProduct(p => ({ ...p, price: parseFloat(e.target.value) }))}
                      className="w-full pl-7 pr-3 text-sm border border-slate-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Açıklama (isteğe bağlı)"
                    value={newProduct.description ?? ''}
                    onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 resize-none"
                  />

                  {addError && (
                    <p className="text-xs text-rose-600 font-semibold">{addError}</p>
                  )}
                  {addSuccess && (
                    <p className="text-xs text-emerald-600 font-semibold">{addSuccess}</p>
                  )}

                  <button
                    onClick={handleAddProduct}
                    disabled={addLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-sm transition-all"
                  >
                    {addLoading ? 'Ekleniyor...' : '+ Ürün Ekle'}
                  </button>
                </div>
              </div>

              {/* Excel Import */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <span>Excel ile Toplu Yükle</span>
                  </h3>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Şablon İndir</span>
                  </button>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Beklenen kolonlar: <span className="font-bold text-slate-700">Ad, Kategori, Fiyat</span>
                  {' '}(isteğe bağlı: Açıklama)
                </p>

                {/* Drag-drop alanı */}
                <div
                  className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); }}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleExcelFile(f);
                  }}
                >
                  <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                  <p className="text-xs font-semibold text-slate-600">
                    {excelFileName ?? 'Dosya seç veya buraya sürükle'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">.xlsx, .xls</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleExcelFile(f);
                    e.target.value = '';
                  }}
                />

                {excelError && (
                  <p className="text-xs text-rose-600 font-semibold mt-2">{excelError}</p>
                )}
                {excelSuccess && (
                  <p className="text-xs text-emerald-600 font-semibold mt-2">{excelSuccess}</p>
                )}

                {/* Önizleme */}
                {excelPreview && excelPreview.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-700">{excelPreview.length} satır hazır</p>
                      <button onClick={() => { setExcelPreview(null); setExcelFileName(null); }} className="text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-50 rounded-lg p-2 mb-2">
                      {excelPreview.slice(0, 10).map((row, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-700 font-medium truncate max-w-[120px]">{row.name}</span>
                          <span className="text-slate-400">{row.category}</span>
                          <span className="text-amber-600 font-bold">{row.price} ₺</span>
                        </div>
                      ))}
                      {excelPreview.length > 10 && (
                        <p className="text-[10px] text-slate-400 text-center">+{excelPreview.length - 10} daha...</p>
                      )}
                    </div>
                    <button
                      onClick={handleExcelUpload}
                      disabled={excelUploading}
                      className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm transition-all"
                    >
                      {excelUploading ? 'Yükleniyor...' : `${excelPreview.length} Ürünü Kaydet`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Sağ: Mevcut Ürün Listesi ─────────────────────────────── */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-amber-500" />
                  <span>Mevcut Ürünler ({products.length})</span>
                </h3>
                <button
                  onClick={loadProducts}
                  className="text-xs text-slate-400 hover:text-slate-700 font-semibold transition-colors"
                >
                  Yenile
                </button>
              </div>

              {/* Kategori grupları */}
              <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-50">
                {categories.filter(c => c !== 'Tümü').map(cat => {
                  const catProds = products.filter(p => p.category === cat);
                  const col = getCategoryColor(cat);
                  return (
                    <div key={cat}>
                      {/* Kategori başlığı */}
                      <div
                        className="flex items-center space-x-2 px-4 py-2 sticky top-0 z-10"
                        style={{ background: col.bg }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                        <span className="text-xs font-bold" style={{ color: col.text }}>{cat}</span>
                        <span className="text-[10px] font-normal opacity-70" style={{ color: col.text }}>({catProds.length} ürün)</span>
                      </div>

                      {/* Ürünler */}
                      {catProds.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 leading-tight">{p.name}</p>
                              {p.description && <p className="text-[11px] text-slate-400 truncate">{p.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 shrink-0 ml-3">
                            <span className="text-sm font-black text-slate-700">{p.price.toFixed(2)} ₺</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.isAvailable
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {p.isAvailable ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {products.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-sm">Henüz ürün eklenmemiş</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
