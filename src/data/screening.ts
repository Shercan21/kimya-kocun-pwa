// Eksik taraması: sınıfın her kazanımından 2 soru çekilir, test gibi çözülür;
// sonuçta kazanım ve konu bazında eksikler çıkarılır.

import { useSyncExternalStore } from 'react'
import { sinifMufredati, testDosyasi, tumKonular, type Soru, type TestDosyasi } from './content'

export const SORU_PER_KAZANIM = 2
const KEY = 'kimya-kocun-pwa-tarama-v1'

export type TaramaSorusu = {
  kazanim: string
  konuKod: string
  testId: string
  soru: Soru
}

export type KazanimSonucu = { kazanim: string; ad: string; dogru: number; toplam: number; konular: string[] }
export type KonuSonucu = { kod: string; ad: string; dogru: number; toplam: number; durum: 'eksik' | 'kismen' | 'tamam' }

export type TaramaSonucu = {
  grade: number
  tarih: string
  dogru: number
  toplam: number
  kazanimlar: KazanimSonucu[]
  konular: KonuSonucu[]
}

function karistir<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Sınıfın bütün kazanımlarından ikişer soru seçer.
export async function taramaHazirla(grade: number): Promise<TaramaSorusu[]> {
  const mufredat = sinifMufredati(grade)
  if (!mufredat) return []
  const konular = tumKonular(grade).map(k => k.konu)
  const ids = new Set<string>()
  for (const k of konular) {
    if (k.test) ids.add(k.test)
    k.baglam.forEach(b => ids.add(b.id))
  }
  const dosyalar = new Map<string, TestDosyasi>()
  await Promise.all(
    [...ids].map(id =>
      testDosyasi(grade, id)
        .then(d => dosyalar.set(id, d))
        .catch(() => { throw new Error('Tarama için gereken soru paketleri tam yüklenemedi.') })
    )
  )

  const secilen: TaramaSorusu[] = []
  for (const kazanim of Object.keys(mufredat.kazanimlar)) {
    const ilgili = konular.filter(k => k.kazanimlar.includes(kazanim))
    if (ilgili.length === 0) continue
    // Konu başına aday sorular: konu testinin kolay ve orta seviyeleri + bu kazanımın bağlam testleri
    const havuz: TaramaSorusu[][] = ilgili.map(k => {
      const list: TaramaSorusu[] = []
      const ana = dosyalar.get(k.test)
      ana?.testler
        .filter(t => t.seviye === 'Kolay' || t.seviye === 'Orta' || t.seviye === null)
        .forEach(t => t.sorular.filter(soru => soru.k ? soru.k === kazanim : k.kazanimlar.length === 1).forEach(soru => list.push({ kazanim, konuKod: k.kod, testId: k.test, soru })))
      k.baglam
        .filter(b => b.kazanim === kazanim)
        .forEach(b =>
          dosyalar.get(b.id)?.testler.forEach(t => t.sorular.forEach(soru => list.push({ kazanim, konuKod: k.kod, testId: b.id, soru })))
        )
      return karistir(list)
    })
    // Mümkünse farklı konulardan sırayla al
    let tur = 0
    let alinan = 0
    while (alinan < SORU_PER_KAZANIM && havuz.some(h => h.length)) {
      const h = havuz[tur % havuz.length]
      const q = h.shift()
      if (q) {
        secilen.push(q)
        alinan++
      }
      tur++
    }
    if (alinan < SORU_PER_KAZANIM) throw new Error("Bu kazanım için yeterli tarama sorusu yok: " + kazanim)
  }
  return secilen
}

export function taramaDegerlendir(grade: number, sorular: TaramaSorusu[], cevaplar: Record<number, number>): TaramaSonucu {
  const mufredat = sinifMufredati(grade)
  const kz = new Map<string, KazanimSonucu>()
  const kn = new Map<string, { dogru: number; toplam: number }>()
  let dogru = 0
  sorular.forEach((q, i) => {
    const ok = cevaplar[i] === q.soru.d
    if (ok) dogru++
    const k = kz.get(q.kazanim) ?? {
      kazanim: q.kazanim,
      ad: mufredat?.kazanimlar[q.kazanim] ?? '',
      dogru: 0,
      toplam: 0,
      konular: [],
    }
    k.toplam++
    if (ok) k.dogru++
    if (!k.konular.includes(q.konuKod)) k.konular.push(q.konuKod)
    kz.set(q.kazanim, k)
  })
  // Konu sonucu: konunun kazanımlarındaki toplam başarı
  for (const { konu } of tumKonular(grade)) {
    const ilgili = konu.kazanimlar.map(c => kz.get(c)).filter((x): x is KazanimSonucu => !!x)
    if (!ilgili.length) continue
    kn.set(konu.kod, {
      dogru: ilgili.reduce((s, x) => s + x.dogru, 0),
      toplam: ilgili.reduce((s, x) => s + x.toplam, 0),
    })
  }
  const konular: KonuSonucu[] = tumKonular(grade)
    .filter(({ konu }) => kn.has(konu.kod))
    .map(({ konu }) => {
      const r = kn.get(konu.kod)!
      const oran = r.toplam ? r.dogru / r.toplam : 0
      return {
        kod: konu.kod,
        ad: konu.ad,
        dogru: r.dogru,
        toplam: r.toplam,
        durum: oran >= 1 ? 'tamam' : oran > 0 ? 'kismen' : 'eksik',
      }
    })
  return {
    grade,
    tarih: new Date().toISOString(),
    dogru,
    toplam: sorular.length,
    kazanimlar: [...kz.values()],
    konular,
  }
}

// --- Kayıt ---

const listeners = new Set<() => void>()
let cache: string | null = null
let parsed: Record<string, TaramaSonucu> = {}

function read(): Record<string, TaramaSonucu> {
  const raw = localStorage.getItem(KEY)
  if (raw !== cache) {
    cache = raw
    try {
      parsed = raw ? (JSON.parse(raw) as Record<string, TaramaSonucu>) : {}
    } catch {
      parsed = {}
    }
  }
  return parsed
}

export function taramaKaydet(sonuc: TaramaSonucu) {
  const all = { ...read(), [sonuc.grade]: sonuc }
  localStorage.setItem(KEY, JSON.stringify(all))
  listeners.forEach(fn => fn())
}

export function useTaramaSonucu(grade: number): TaramaSonucu | null {
  const all = useSyncExternalStore(
    fn => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    read
  )
  return all[grade] ?? null
}

// Derslerim'de "eksik" işareti için: grade|kod
export function eksikKonular(sonuc: TaramaSonucu | null): Map<string, KonuSonucu['durum']> {
  const m = new Map<string, KonuSonucu['durum']>()
  sonuc?.konular.forEach(k => m.set(`${sonuc.grade}|${k.kod}`, k.durum))
  return m
}
