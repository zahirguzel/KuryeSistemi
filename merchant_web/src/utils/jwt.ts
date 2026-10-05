// src/utils/jwt.ts
//
// JWT yük okuma (imza DOĞRULAMAZ). Yalnızca süresi dolmuş token'la açılışı baştan engellemek içindir;
// gerçek doğrulama sunucudadır (401 → api.ts interceptor oturumu kapatır).

function readPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Token süresi dolmuş (veya okunamıyor) ise true. */
export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const exp = readPayload(token)?.exp;
  if (typeof exp !== 'number') return true;
  return Date.now() / 1000 >= exp - skewSeconds;
}
