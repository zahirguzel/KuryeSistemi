import { useEffect, useRef } from 'react';
import { startSignalR, onOrderUpdate, onCourierSos, type OrderUpdatePayload } from '../services/signalRService';
import { useNotificationStore, type NotificationType } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { audioAlert } from '../utils/audioAlert';

export function useNotificationListener(): void {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const addNotifRef = useRef(addNotification);
  addNotifRef.current = addNotification;

  useEffect(() => {
    // 1. Tarayıcı Masaüstü Bildirim İzni Talep Et (Sekme arka planda bile olsa Windows/OS bildirimi için)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }

    // 2. Ses Motorunu Isıt / Hazırla
    audioAlert.unlockAudio();

    // 3. WebSocket bağlantısını başlat
    startSignalR().catch((err) => {
      console.warn('[NotificationListener] SignalR başlatılamadı:', err);
    });

    // 4. Sipariş güncellemelerini dinle
    const unsubscribe = onOrderUpdate((payload: OrderUpdatePayload) => {
      console.info('[NotificationListener] Canlı olay yakalandı:', payload);

      // İşletme (Restoran) filtresi: Eğer kullanıcı restoransa ve sipariş başka işletmeye aitse filtrele
      const { user: currentUser, merchant: currentMerchant } = useAuthStore.getState();
      const isMerchantOnly = currentUser && !currentUser.roles?.some((r) => ['CourierFirm', 'Admin', 'FirmAdmin'].includes(r));
      
      const myMerchantId = (currentUser?.merchantId || currentMerchant?.id || '').toLowerCase().trim();
      const payloadMerchantId = (payload.merchantId || '').toLowerCase().trim();

      if (isMerchantOnly && myMerchantId && payloadMerchantId && myMerchantId !== payloadMerchantId) {
        console.info(`[NotificationListener] Başka işletmeye ait sipariş filtrelendi (${payloadMerchantId} !== ${myMerchantId})`);
        return;
      }

      const statusLower = (payload.status || '').toLowerCase().trim();
      let type: NotificationType = 'info';
      let title = 'Sipariş Güncellemesi';
      let message = payload.message || `Sipariş durumu güncellendi: ${payload.status}`;

      if (
        statusLower.includes('created') ||
        statusLower.includes('pending') ||
        statusLower.includes('ready') ||
        statusLower === '0'
      ) {
        type = 'new_order';
        title = '🔔 Yeni Sipariş Alındı!';
        message = payload.message || 'Havuza yeni bir paket teslimatı eklendi.';
      } else if (statusLower.includes('assigned') || statusLower === '1') {
        type = 'assigned';
        title = '🛵 Kurye Atandı';
        message = payload.message || 'Sipariş kurye zimmetine aktarıldı.';
      } else if (
        statusLower.includes('pickedup') ||
        statusLower.includes('ontheway') ||
        statusLower.includes('indelivery') ||
        statusLower === '2'
      ) {
        type = 'assigned';
        title = '🚀 Sipariş Yola Çıktı';
        message = payload.message || 'Kurye paketi teslim aldı, adrese gidiyor.';
      } else if (
        statusLower.includes('delivered') ||
        statusLower.includes('completed') ||
        statusLower === '3'
      ) {
        type = 'delivered';
        title = '✅ Sipariş Teslim Edildi!';
        message = payload.message || 'Paket başarıyla alıcıya teslim edildi.';
      } else if (
        statusLower.includes('cancelled') ||
        statusLower.includes('rejected') ||
        statusLower === '4'
      ) {
        type = 'cancelled';
        title = '⚠️ Sipariş İptal Edildi';
        message = payload.message || 'Sipariş iptal işlemi gerçekleşti.';
      }

      const orderCode = payload.orderId ? payload.orderId.substring(0, 8).toUpperCase() : undefined;

      // Bildirim listesine ve Toast popup'a ekle + Ses çal
      addNotifRef.current({
        type,
        title,
        message,
        orderId: payload.orderId,
        orderCode,
      });

      // Sekme arka plandaysa Windows Masaüstü Bildirimi çıkar
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          if (document.hidden) {
            new Notification(title, {
              body: message,
              icon: '/favicon.ico',
            });
          }
        } catch (_) {}
      }
    });

    // Kurye acil durum çağrısı: kapanmayan kırmızı uyarı + alarm sesi
    const unsubscribeSos = onCourierSos((sos) => {
      const where = sos.latitude != null && sos.longitude != null
        ? ` • Konum: ${sos.latitude.toFixed(5)}, ${sos.longitude.toFixed(5)}`
        : '';
      addNotifRef.current({
        type: 'sos',
        title: `🚨 ACİL DURUM: ${sos.courierName}`,
        message: `Tel: ${sos.phoneNumber || '—'}${sos.note ? ` • "${sos.note}"` : ''}${where}`,
      });
    });

    return () => {
      unsubscribeSos();
      unsubscribe();
    };
  }, []);
}
