// Müfredat ve içerik (tools/icerik_aktar.py ile üretilir).
// Müfredat ağacı pakete gömülür; konu anlatımı, test ve etkinlikler
// ihtiyaç olduğunda public/icerik altından yüklenir.

import mufredatData from './mufredat.json'

export type Seviye = 'Kolay' | 'Orta' | 'Zor' | null

export type BaglamTest = { id: string; baslik: string; kazanim: string | null; soru: number }
export type GenelTest = { id: string; baslik: string; soru: number }

export type Konu = {
  kod: string
  ad: string
  gizli?: boolean
  kazanimlar: string[]
  test: string
  seviyeler: Seviye[]
  soru: number
  baglam: BaglamTest[]
  anlatim: boolean
  etkinlik: number
}

export type Bolum = {
  kod: string
  tema: number
  ad: string
  ozet: string
  konular: Konu[]
  sarmal: GenelTest[]
}

export type Tema = { no: number; ad: string; bolumler: Bolum[] }

export type SinifMufredat = {
  sinif: number
  temalar: Tema[]
  karma: GenelTest[]
  kazanimlar: Record<string, string>
  kelimeler: Record<string, string[]>
}

export type Soru = {
  gorselTamSoru?: boolean // Soru ve şıklar görselin içinde; yanıtta yalnız harfler gösterilir.
  id?: string
  s: string // HTML soru metni
  sik: string[] // HTML şıklar
  d: number // doğru şık sırası (0'dan)
  c?: string // HTML çözüm
  z?: string // zorluk
  k?: string // kazanım (sarmal/karma sorularında tahmini etiket)
}

export type TestDosyasi = {
  id: string
  baslik: string
  tur: 'kazanim' | 'baglam' | 'sarmal' | 'karma'
  testler: { seviye: Seviye; sorular: Soru[] }[]
  legacyTestler?: { seviye: Seviye; sorular: Soru[] }[]
  silindi?: boolean
}

let mufredat = mufredatData as unknown as Record<string, SinifMufredat>

export async function loadPublishedCurriculum() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'icerik/mufredat.json', { cache: 'no-cache', signal: controller.signal })
    if (!response.ok) return
    const data = await response.json() as Record<string, SinifMufredat>
    if (Object.values(data).every(g => Array.isArray(g.temalar) && g.kazanimlar && Array.isArray(g.karma))) mufredat = data
  } catch { /* Offline: use bundled curriculum. */ } finally { clearTimeout(timer) }
}

export function sinifMufredati(grade: number | null): SinifMufredat | null {
  const data = grade === null ? null : mufredat[String(grade)] ?? null
  if (!data) return null
  return { ...data, temalar: data.temalar.map(t => ({ ...t, bolumler: t.bolumler.map(b => ({ ...b, konular: b.konular.filter(k => !k.gizli) })) })) }
}

export function icerikliSiniflar(): number[] {
  return Object.keys(mufredat).map(Number)
}

export function konuId(grade: number, kod: string) {
  return `${grade}-${kod}`
}

export function tumKonular(grade: number): { konu: Konu; bolum: Bolum; tema: Tema }[] {
  const data = sinifMufredati(grade)
  if (!data) return []
  return data.temalar.flatMap(tema =>
    tema.bolumler.flatMap(bolum => bolum.konular.map(konu => ({ konu, bolum, tema })))
  )
}

export function konuBul(grade: number, kod: string) {
  return tumKonular(grade).find(item => item.konu.kod === kod) ?? null
}

const base = import.meta.env.BASE_URL

// İçerikteki img/... yollarını uygulamanın adresine çevirir.
export function icerikHtml(html: string): string {
  return html.replace(/(src=["'])(img\/)/g, `$1${base}icerik/$2`)
}

export function icerikYolu(path: string): string {
  return `${base}icerik/${path}`
}

const cache = new Map<string, Promise<unknown>>()

function load<T>(path: string, as: 'json'): Promise<T> {
  const key = `${as}:${path}`
  if (!cache.has(key)) {
    const promise = fetch(icerikYolu(path)).then(response => {
      if (!response.ok) throw new Error('İçerik yüklenemedi.')
      return response.json()
    })
    promise.catch(() => cache.delete(key))
    cache.set(key, promise)
  }
  return cache.get(key) as Promise<T>
}

function pick<T>(data: Record<string, T>, key: string): T {
  if (!(key in data)) throw new Error('İçerik bulunamadı.')
  return data[key]
}

export function konuAnlatimi(grade: number, kod: string) {
  return load<Record<string, string>>(`${grade}/konular.json`, 'json').then(data => icerikHtml(pick(data, kod)))
}

export function ayrintiliAnlatim(grade: number, kod: string) {
  return load<Record<string, string>>(grade + '/anlatim-detay.json', 'json').then(data => icerikHtml(pick(data, kod)))
}

export function testDosyasi(grade: number, id: string) {
  return load<Record<string, TestDosyasi>>(`${grade}/testler.json`, 'json').then(data => pick(data, id))
}

export type Etkinlik = {
  no: number
  tur: 'dy' | 'es' | 'bo' | 'au' | 'ta' | 'kh'
  yonerge: string
  [key: string]: unknown
}

export type EtkinlikKitabi = { kod: string; ad: string; amac: string; etkinlikler: Etkinlik[] }

export function etkinlikler(grade: number, kod: string) {
  return load<Record<string, EtkinlikKitabi>>(`${grade}/etkinlikler.json`, 'json').then(data => pick(data, kod))
}

// ---------- Yazılıya hazırlık ----------

export type YaziliMadde = { h: string; p: number; s: string; c: string }
export type YaziliSoru = { baglam: string; maddeler: YaziliMadde[]; kazanim: string; puan: number }
export type YaziliSinav = {
  id: string
  donem: number
  yazili: number
  senaryo: number
  sure: number
  sorular: YaziliSoru[]
  aktif?: boolean
  tarih?: string
  pdfAvailable?: boolean
}
export type YaziliDosyasi = {
  sinavlar: YaziliSinav[]
  tumu: { donem: number; yazili: number }[]
  kazanimlar: Record<string, string>
}

export function yazililar(grade: number) {
  return load<YaziliDosyasi>(`${grade}/yazili.json`, 'json').then(d => ({ ...d, sinavlar: d.sinavlar.filter(s => s.aktif !== false) }))
}

export function yaziliPdfAdi(grade: number, sinav: YaziliSinav) {
  return `${grade}-sinif-${sinav.donem}-donem-${sinav.yazili}-yazili-senaryo-${sinav.senaryo}`
}

// Bir testin sorularına varsayılan kazanım: bağlam testinin kazanımı ya da
// tek kazanımlı konunun kazanımı. Sarmal/karma sorularında soru kendi "k"sını taşır.
export function testKazanimi(grade: number, testId: string): string | null {
  for (const { konu } of tumKonular(grade)) {
    const b = konu.baglam.find(x => x.id === testId)
    if (b) return b.kazanim
    if (konu.test === testId) return konu.kazanimlar.length === 1 ? konu.kazanimlar[0] : null
  }
  return null
}
