// Aydınlatma metni onayı (sürümlü; metin değişirse yeniden sorulur).

export const KVKK_KEY = 'kimya-kocun-pwa-kvkk-onay'
export const KVKK_SURUM = '2026-11-03'

export function kvkkOnayliMi() {
  try {
    const raw = localStorage.getItem(KVKK_KEY)
    return !!raw && (JSON.parse(raw) as { surum?: string }).surum === KVKK_SURUM
  } catch {
    return false
  }
}

export function kvkkOnayla() {
  localStorage.setItem(KVKK_KEY, JSON.stringify({ surum: KVKK_SURUM, tarih: new Date().toISOString() }))
}
