import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import { merchantService } from '../services/merchantService';

// ─── Rol bazlı yönlendirme yardımcısı ────────────────────────────────────────
function resolveRedirectPath(roles: string[] = []): string {
  const isFirmAdmin = roles.some((r) =>
    ['CourierFirm', 'Admin', 'FirmAdmin'].includes(r)
  );
  return isFirmAdmin ? '/firm/dashboard' : '/radar';
}

// ─────────────────────────────────────────────────────────────────────────────

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  const { login } = useAuthStore();
  const navigate = useNavigate();


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorDetails([]);

    if (!email.trim()) {
      setErrorMessage('Lütfen e-posta adresinizi giriniz.');
      return;
    }
    if (!password) {
      setErrorMessage('Lütfen şifrenizi giriniz.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.login({ email: email.trim(), password });

      if (result.isSuccess && result.data) {
        login(result.data);

        // Giriş yapan kullanıcının veritabanındaki GPS ve profil ayarlarını anında yükle
        try {
          const profileRes = await merchantService.getSettings(result.data.merchantId);
          if (profileRes.isSuccess && profileRes.data) {
            const p = profileRes.data;
            useAuthStore.getState().updateMerchant({
              name: p.name,
              phoneNumber: p.phoneNumber,
              address: p.address,
              isOpen: p.isOpen,
              latitude: p.latitude,
              longitude: p.longitude,
              defaultPackageFee: p.defaultPackageFee,
              dispatchMode: p.dispatchMode,
              reconciliationPeriod: p.reconciliationPeriod,
              hexagonSizeMeters: p.hexagonSizeMeters,
              maxCourierDistanceKm: p.maxCourierDistanceKm,
              maxOrdersPerTour: p.maxOrdersPerTour,
              orderBatchingTimeMinutes: p.orderBatchingTimeMinutes,
              crossRestaurantDistanceMeters: p.crossRestaurantDistanceMeters,
            });
          }
        } catch (e) {
          console.warn('Profil koordinatları yüklenirken hata:', e);
        }

        // Rol bazlı yönlendir
        const target = resolveRedirectPath(result.data.roles ?? []);
        navigate(target);
      } else {
        setErrorMessage(
          result.message || 'Giriş işlemi başarısız oldu. Lütfen bilgilerinizi kontrol edin.'
        );
        if (result.errors && result.errors.length > 0) {
          setErrorDetails(result.errors);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-5">

        {/* ── Logo Kartı ────────────────────────────────────────────── */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl items-center justify-center shadow-xl shadow-teal-500/30">
            <Bike className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              KuryeSistemi
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Kurumsal Lojistik Yönetim Platformu
            </p>
          </div>
        </div>

        {/* ── Giriş Formu Kartı ─────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 space-y-5">

          <div>
            <h2 className="text-lg font-black text-slate-800">Hesabınıza Giriş Yapın</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              İşletme veya kurye firması hesabınızla giriş yapabilirsiniz.
            </p>
          </div>

          {/* Hata mesajı */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-xs">Giriş Başarısız</h4>
                  <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
                  {errorDetails.length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-[11px] text-rose-600 space-y-0.5">
                      {errorDetails.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                E-Posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@isletme.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[46px] disabled:opacity-60 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type="password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[46px] disabled:opacity-60 transition-colors"
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none text-white font-black text-sm shadow-lg shadow-teal-500/25 flex items-center justify-center space-x-2 transition-all min-h-[48px] touch-manipulation"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Giriş Yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Hızlı Demo Giriş Butonları */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider">Hızlı Demo Girişi</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('zahirfirma@gmail.com');
                  setPassword('sifre123');
                }}
                className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100 text-left transition-all text-xs"
              >
                <span className="font-bold text-teal-800 block">👑 Kurye Firması</span>
                <span className="text-[10px] text-teal-600 block truncate">zahirfirma@gmail.com</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('iskenderun@restoran.com');
                  setPassword('sifre123');
                }}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-left transition-all text-xs"
              >
                <span className="font-bold text-amber-800 block">🏪 Restoran / İşletme</span>
                <span className="text-[10px] text-amber-600 block truncate">iskenderun@restoran.com</span>
              </button>
            </div>
          </div>

          {/* Alt bilgi */}
          <p className="text-center text-[11px] text-slate-400 pt-1">
            Şifrenizi unuttuysanız sistem yöneticinizle iletişime geçin.
          </p>
        </div>

        {/* Alt bilgi */}
        <p className="text-center text-xs text-slate-400">
          KuryeSistemi Kurumsal Lojistik Ağı © 2026
        </p>

      </div>
    </div>
  );
};
