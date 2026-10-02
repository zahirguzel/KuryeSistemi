import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, UserPlus, Shield, KeyRound, CheckCircle2, XCircle,
  Coins, History, RefreshCw, Search, Phone, Mail,
  AlertTriangle, X, Check, Save
} from 'lucide-react';
import {
  companyService,
  type CompanyUserDto,
  type MyCompanyDto,
  type CreditTransactionDto,
  type CreateCompanyUserRequest,
  type UpdatePermissionsRequest
} from '../../services/companyService';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  Manager: { label: 'Yönetici', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  Operator: { label: 'Operatör / Dağıtıcı', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  Accountant: { label: 'Muhasebe / Finans', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Support: { label: 'Müşteri Desteği', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  '0': { label: 'Yönetici', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  '1': { label: 'Operatör / Dağıtıcı', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  '2': { label: 'Muhasebe / Finans', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  '3': { label: 'Müşteri Desteği', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
};

export const FirmUsers: React.FC = () => {
  const [users, setUsers] = useState<CompanyUserDto[]>([]);
  const [company, setCompany] = useState<MyCompanyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPermOpen, setIsPermOpen] = useState(false);
  const [isCreditHistoryOpen, setIsCreditHistoryOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUserDto | null>(null);

  // New User Form State
  const [newUser, setNewUser] = useState<CreateCompanyUserRequest>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'Operator',
  });

  // Permissions Edit State
  const [editPerms, setEditPerms] = useState<UpdatePermissionsRequest>({});

  // Credit history state
  const [creditHistory, setCreditHistory] = useState<CreditTransactionDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [uList, comp] = await Promise.all([
        companyService.getUsers(),
        companyService.getMyCompany()
      ]);
      setUsers(uList);
      setCompany(comp);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotification = (text: string, type: 'success' | 'error') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleToggleActive = async (user: CompanyUserDto) => {
    const res = await companyService.toggleUserActive(user.id);
    if (res.success) {
      showNotification(`${user.firstName} ${user.lastName} durumu güncellendi.`, 'success');
      loadData();
    } else {
      showNotification(res.message || 'Hata oluştu.', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
      showNotification('Lütfen zorunlu alanları doldurun.', 'error');
      return;
    }
    const res = await companyService.createUser(newUser);
    if (res.success) {
      showNotification('Alt kullanıcı başarıyla eklendi.', 'success');
      setIsAddOpen(false);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phoneNumber: '',
        role: 'Operator',
      });
      loadData();
    } else {
      showNotification(res.message || 'Kullanıcı eklenemedi.', 'error');
    }
  };

  const openPermissionModal = (u: CompanyUserDto) => {
    setSelectedUser(u);
    setEditPerms({
      canViewReports: u.permissions.viewReports,
      canManageFinance: u.permissions.manageFinance,
      canManageCouriers: u.permissions.manageCouriers,
      canManageOrders: u.permissions.manageOrders,
      canManageMerchants: u.permissions.manageMerchants,
      canEditCompanySettings: u.permissions.editSettings,
    });
    setIsPermOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    const res = await companyService.updatePermissions(selectedUser.id, editPerms);
    if (res.success) {
      showNotification('Kullanıcı izinleri başarıyla güncellendi.', 'success');
      setIsPermOpen(false);
      loadData();
    } else {
      showNotification(res.message || 'İzinler güncellenemedi.', 'error');
    }
  };

  const openCreditHistory = async () => {
    setIsCreditHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await companyService.getCreditHistory(1, 50);
      setCreditHistory(res.items);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phoneNumber && u.phoneNumber.includes(q))
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Üst Banner & Kontör Kartı ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Başlık Kartı */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div>
            <div className="flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Shield className="w-4 h-4" />
              <span>Firma Yönetim Merkezi</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white">Alt Kullanıcılar ve Yetkilendirme</h1>
            <p className="text-slate-400 text-xs mt-1 max-w-xl">
              Firma içi operatör, muhasebe ve destek personellerinizi yönetin, roller ve ayrıntılı izinler atayın.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Yeni Alt Kullanıcı Ekle</span>
            </button>
            <button
              onClick={loadData}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-600/50 active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Yenile</span>
            </button>
          </div>
        </div>

        {/* Kontör Kartı */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 rounded-2xl p-5 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Firma Kontör Bakiyesi</p>
                <h3 className="text-2xl font-black text-amber-400">
                  {company?.creditBalance?.toLocaleString('tr-TR') ?? '0'} <span className="text-xs text-slate-400 font-semibold">Kontör</span>
                </h3>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              Eşik: <strong className="text-slate-200">{company?.creditWarningThreshold ?? 100}</strong>
            </span>
            <button
              onClick={openCreditHistory}
              className="text-teal-400 hover:text-teal-300 font-bold flex items-center space-x-1 text-xs"
            >
              <History className="w-3.5 h-3.5" />
              <span>Geçmiş</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bildirim Mesajı */}
      {msg && (
        <div
          className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-bold transition-all ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* ── Filtreler & Arama ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="İsim, e-posta veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold self-end md:self-center">
          Toplam <strong>{filteredUsers.length}</strong> alt kullanıcı
        </div>
      </div>

      {/* ── Kullanıcı Listesi Kartları / Tablo ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => {
          const roleInfo = ROLE_LABELS[String(u.role)] ?? {
            label: String(u.role),
            color: 'bg-slate-100 text-slate-700 border-slate-200',
          };

          return (
            <div
              key={u.id}
              className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
                u.isActive ? 'border-slate-200 hover:shadow-md' : 'border-rose-200 bg-rose-50/20 opacity-75'
              }`}
            >
              <div>
                {/* Üst Kısım: Avatar & Rol & Durum */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                      {u.firstName.charAt(0).toUpperCase()}
                      {u.lastName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {u.firstName} {u.lastName}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                      u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {u.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                {/* İletişim Bilgileri */}
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  {u.phoneNumber && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{u.phoneNumber}</span>
                    </div>
                  )}
                </div>

                {/* Yetki Göstergeleri */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Modül İzinleri
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <PermChip label="Siparişler" active={u.permissions.manageOrders} />
                    <PermChip label="Kuryeler" active={u.permissions.manageCouriers} />
                    <PermChip label="İşletmeler" active={u.permissions.manageMerchants} />
                    <PermChip label="Finans" active={u.permissions.manageFinance} />
                    <PermChip label="Raporlar" active={u.permissions.viewReports} />
                    <PermChip label="Ayarlar" active={u.permissions.editSettings} />
                  </div>
                </div>
              </div>

              {/* Alt Butonlar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => openPermissionModal(u)}
                  className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>İzinler</span>
                </button>

                <button
                  onClick={() => handleToggleActive(u)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
                    u.isActive
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  {u.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{u.isActive ? 'Pasife Al' : 'Aktif Et'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-sm">Alt kullanıcı bulunamadı.</p>
          <p className="text-xs text-slate-400 mt-1">Arama kriterlerinizi değiştirin veya yeni kullanıcı ekleyin.</p>
        </div>
      )}

      {/* ── Yeni Kullanıcı Ekleme Modalı ──────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base text-slate-900">Yeni Alt Kullanıcı Oluştur</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Ad *</label>
                  <input
                    type="text"
                    required
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Soyad *</label>
                  <input
                    type="text"
                    required
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">E-Posta *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Telefon</label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxxx"
                    value={newUser.phoneNumber}
                    onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Şifre *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Varsayılan Rol *</label>
                <select
                  value={String(newUser.role)}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="Operator">Operatör / Dağıtıcı (Sipariş + Kurye Yönetimi)</option>
                  <option value="Accountant">Muhasebe / Finans (Cari Hesap + Raporlar)</option>
                  <option value="Support">Müşteri Desteği (Yalnızca Sipariş Takip)</option>
                  <option value="Manager">Yönetici (Tüm Modüller Açık)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Rol seçildiğinde yetkiler otomatik atanır; sonradan "İzinler" menüsünden özelleştirilebilir.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── İzin Düzenleme Modalı ────────────────────────────────────────── */}
      {isPermOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Yetkilendirme Ayarları</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedUser.firstName} {selectedUser.lastName} ({ROLE_LABELS[String(selectedUser.role)]?.label})
                </p>
              </div>
              <button onClick={() => setIsPermOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <PermToggle
                label="Sipariş Yönetimi"
                desc="Yeni sipariş oluşturma, durum güncelleme, atama"
                checked={Boolean(editPerms.canManageOrders)}
                onChange={(c) => setEditPerms({ ...editPerms, canManageOrders: c })}
              />
              <PermToggle
                label="Kurye Yönetimi"
                desc="Kurye ekleme, düzenleme, vardiya kontrolü"
                checked={Boolean(editPerms.canManageCouriers)}
                onChange={(c) => setEditPerms({ ...editPerms, canManageCouriers: c })}
              />
              <PermToggle
                label="İşletme (Restoran) Yönetimi"
                desc="Yeni işletme açma, komisyon ve ayar belirleme"
                checked={Boolean(editPerms.canManageMerchants)}
                onChange={(c) => setEditPerms({ ...editPerms, canManageMerchants: c })}
              />
              <PermToggle
                label="Kasa & Finans Yönetimi"
                desc="Kasa mahsuplaşma, borç/alacak takibi, cari işlemler"
                checked={Boolean(editPerms.canManageFinance)}
                onChange={(c) => setEditPerms({ ...editPerms, canManageFinance: c })}
              />
              <PermToggle
                label="Raporlar ve İstatistikler"
                desc="Teslimat, kurye puanı ve finansal raporlar"
                checked={Boolean(editPerms.canViewReports)}
                onChange={(e) => setEditPerms({ ...editPerms, canViewReports: e })}
              />
              <PermToggle
                label="Firma Ayarları ve Kullanıcılar"
                desc="Alt kullanıcı açma, genel havuz ve bölge ayarları"
                checked={Boolean(editPerms.canEditCompanySettings)}
                onChange={(c) => setEditPerms({ ...editPerms, canEditCompanySettings: c })}
              />
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsPermOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>İzinleri Uygula</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Kontör Hareket Geçmişi Modalı ─────────────────────────────────── */}
      {isCreditHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900">Kontör Hareket Geçmişi</h3>
              </div>
              <button onClick={() => setIsCreditHistoryOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-500" />
                  <span>Yükleniyor...</span>
                </div>
              ) : creditHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Henüz kontör hareketi yok.</div>
              ) : (
                creditHistory.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{item.notes || item.type}</p>
                      <p className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString('tr-TR')}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-black ${item.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.amount >= 0 ? `+${item.amount}` : item.amount} Kontör
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold">Bakiye: {item.balanceAfter}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsCreditHistoryOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Küçük Yardımcı Bileşenler ──────────────────────────────────────────────────

function PermChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center space-x-1 ${
        active
          ? 'bg-teal-500/10 text-teal-700 border-teal-500/30'
          : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60'
      }`}
    >
      <span>{label}</span>
    </span>
  );
}

function PermToggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all">
      <div className="pr-3">
        <p className="font-bold text-xs text-slate-800">{label}</p>
        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{desc}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
      />
    </label>
  );
}

export default FirmUsers;
