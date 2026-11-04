// Etkinlik sonuçları: "Kontrol et" ile kontrol edilen her etkinliğin son puanı.

import { createContext } from 'react'

const KEY = 'kimya-kocun-pwa-etkinlik-sonuclari-v1'

export type EtkinlikSonucu = { grade: number; kod: string; no: number; dogru: number; toplam: number; tarih: string }

export function etkinlikSonuclari(): EtkinlikSonucu[] {
  try {
    const raw = localStorage.getItem(KEY)
    const data: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(data) ? (data as EtkinlikSonucu[]) : []
  } catch {
    return []
  }
}

export function etkinlikSonucuKaydet(s: Omit<EtkinlikSonucu, 'tarih'>) {
  const list = etkinlikSonuclari().filter(x => !(x.grade === s.grade && x.kod === s.kod && x.no === s.no))
  list.push({ ...s, tarih: new Date().toISOString() })
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // depolama doluysa yalnızca ekranda kalır
  }
}

// Etkinlik bileşenleri puanı bu bağlam üzerinden bildirir.
export const EtkinlikKayit = createContext<((dogru: number, toplam: number) => void) | null>(null)
