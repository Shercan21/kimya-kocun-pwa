// Kazanım raporu: öğrencinin çözdüğü her şeyden kazanım bazında başarı.
// Kaynaklar:
// - Kazanım (konu) ve bağlam testleri → testin/konunun kazanımı
// - Sarmal ve karma testler → her sorunun (tahmini) kazanım etiketi
// - Etkinlikler → etkinliğin konusunun kazanımları
// - Eksik taraması → soru bazında kazanım

import { sinifMufredati, testKazanimi, tumKonular } from './content'
import { sonuclariYukle, type TestSonucu } from './results'
import { etkinlikSonuclari } from './activityResults'
import type { TaramaSonucu } from './screening'

export type KazanimDurum = 'iyi' | 'tekrar' | 'eksik' | 'yok'
export type Kaynak = 'test' | 'sarmal' | 'karma' | 'etkinlik' | 'tarama'

export const KAYNAK_AD: Record<Kaynak, string> = {
  test: 'Kazanım testleri',
  sarmal: 'Sarmal',
  karma: 'Karma',
  etkinlik: 'Etkinlik',
  tarama: 'Tarama',
}

type Sayac = { dogru: number; toplam: number }

export type KazanimSatiri = {
  grade: number
  kod: string
  ad: string
  dogru: number
  toplam: number
  oran: number | null
  durum: KazanimDurum
  kaynaklar: Partial<Record<Kaynak, number>> // kaynak → başarı %
  konular: { kod: string; ad: string }[]
}

export type GenelTestSatiri = {
  grade: number
  tur: 'sarmal' | 'karma'
  baslik: string
  oran: number
  deneme: number
}

export function durumOf(oran: number | null): KazanimDurum {
  if (oran === null) return 'yok'
  if (oran >= 70) return 'iyi'
  if (oran >= 40) return 'tekrar'
  return 'eksik'
}

const yuzde = (c?: Sayac) => (c && c.toplam ? Math.round((c.dogru / c.toplam) * 100) : null)

export function kazanimRaporu(grades: number[], taramalar: (TaramaSonucu | null)[]) {
  const sonuclar = sonuclariYukle().filter(r => grades.includes(r.grade))
  const etkinlikler = etkinlikSonuclari().filter(e => grades.includes(e.grade))
  const satirlar: KazanimSatiri[] = []
  const genel: GenelTestSatiri[] = []
  const turToplam: Partial<Record<Kaynak, Sayac>> = {}
  const turEkle = (k: Kaynak, d: number, t: number) => {
    const c = (turToplam[k] ??= { dogru: 0, toplam: 0 })
    c.dogru += d
    c.toplam += t
  }

  for (const grade of grades) {
    const m = sinifMufredati(grade)
    if (!m) continue
    const konular = tumKonular(grade)
    const sayac = new Map<string, Map<Kaynak, Sayac>>()
    const ekle = (kod: string, kaynak: Kaynak, dogru: number, toplam: number) => {
      const bk = sayac.get(kod) ?? new Map<Kaynak, Sayac>()
      const c = bk.get(kaynak) ?? { dogru: 0, toplam: 0 }
      c.dogru += dogru
      c.toplam += toplam
      bk.set(kaynak, c)
      sayac.set(kod, bk)
    }

    const sarmalBaslik = new Map<string, string>()
    m.temalar.forEach(t => t.bolumler.forEach(b => b.sarmal.forEach(s => sarmalBaslik.set(s.id, `${b.kod} ${b.ad}`))))
    const karmaNo = new Map(m.karma.map((k, i) => [k.id, i + 1]))
    const konuByTest = new Map(konular.map(({ konu }) => [konu.test, konu]))

    const sonGenel = new Map<string, { r: TestSonucu; deneme: number }>()
    for (const r of sonuclar.filter(x => x.grade === grade)) {
      const kaynak: Kaynak = sarmalBaslik.has(r.testId) ? 'sarmal' : karmaNo.has(r.testId) ? 'karma' : 'test'
      turEkle(kaynak, r.dogru, r.toplam)
      if (kaynak !== 'test') {
        const prev = sonGenel.get(r.testId)
        sonGenel.set(r.testId, { r, deneme: (prev?.deneme ?? 0) + 1 })
      }
      if (r.kazanimlar) {
        for (const [kod, [d, t]] of Object.entries(r.kazanimlar)) ekle(kod, kaynak, d, t)
        continue
      }
      // Eski kayıtlar (soru bazında kazanım yok): test/konu kazanımına dağıt
      if (kaynak !== 'test') continue
      const tek = testKazanimi(grade, r.testId)
      if (tek) ekle(tek, 'test', r.dogru, r.toplam)
      else {
        const kk = konuByTest.get(r.testId)?.kazanimlar ?? []
        kk.forEach(k => ekle(k, 'test', r.dogru / kk.length, r.toplam / kk.length))
      }
    }

    for (const e of etkinlikler.filter(x => x.grade === grade)) {
      turEkle('etkinlik', e.dogru, e.toplam)
      const kk = konular.find(({ konu }) => konu.kod === e.kod)?.konu.kazanimlar ?? []
      kk.forEach(k => ekle(k, 'etkinlik', e.dogru / kk.length, e.toplam / kk.length))
    }

    const tarama = taramalar.find(t => t?.grade === grade)
    tarama?.kazanimlar.forEach(k => {
      ekle(k.kazanim, 'tarama', k.dogru, k.toplam)
      turEkle('tarama', k.dogru, k.toplam)
    })

    for (const [kod, ad] of Object.entries(m.kazanimlar)) {
      const bk = sayac.get(kod)
      const toplam: Sayac = { dogru: 0, toplam: 0 }
      const kaynaklar: Partial<Record<Kaynak, number>> = {}
      bk?.forEach((c, kaynak) => {
        toplam.dogru += c.dogru
        toplam.toplam += c.toplam
        const y = yuzde(c)
        if (y !== null) kaynaklar[kaynak] = y
      })
      const oran = yuzde(toplam)
      satirlar.push({
        grade,
        kod,
        ad,
        dogru: Math.round(toplam.dogru),
        toplam: Math.round(toplam.toplam),
        oran,
        durum: durumOf(oran),
        kaynaklar,
        konular: konular.filter(({ konu }) => konu.kazanimlar.includes(kod)).map(({ konu }) => ({ kod: konu.kod, ad: konu.ad })),
      })
    }

    for (const [id, { r, deneme }] of sonGenel) {
      genel.push({
        grade,
        tur: sarmalBaslik.has(id) ? 'sarmal' : 'karma',
        baslik: sarmalBaslik.get(id) ?? `Karma test ${karmaNo.get(id)}`,
        oran: r.toplam ? Math.round((r.dogru / r.toplam) * 100) : 0,
        deneme,
      })
    }
  }

  const turlar = (Object.keys(turToplam) as Kaynak[]).map(k => ({ kaynak: k, oran: yuzde(turToplam[k])!, toplam: Math.round(turToplam[k]!.toplam) }))
  return { satirlar, genel, turlar }
}
