// Kural tabanlı koç: öğrencinin test sonuçlarına, hata defterine ve konu
// durumlarına bakarak kişisel öneriler üretir. Yapay zekâ kullanmaz;
// her öneri öğrencinin kendi verisinden ve konu yapısından gelir.

import { konuBul, konuId, tumKonular, type Konu } from './content'
import { loadLearningProgress, type LearningStatus } from './learningProgress'
import { NEDEN_AD, type HataKaydi, type HataNedeni } from './mistakes'
import { basari, GECME_ORANI, sonuclariYukle, type TestSonucu } from './results'

export type Eylem =
  | { tur: 'anlatim' | 'test' | 'etkinlik'; grade: number; kod: string }
  | { tur: 'hata' }
  | { tur: 'dersler' }

export type Oneri = {
  id: string
  oncelik: number // küçük olan önce
  baslik: string
  detay: string
  eylem: Eylem
  etiket: string
}

// Hata nedenine göre çalışma tavsiyesi
export const NEDEN_TAVSIYE: Record<HataNedeni, { ipucu: string; eylem: 'anlatim' | 'etkinlik' | 'test' | 'hata'; etiket: string }> = {
  bilgi: {
    ipucu: 'Eksik bilgi var. Konu anlatımını baştan, not alarak oku; sonra kolay seviyeden başla.',
    eylem: 'anlatim',
    etiket: 'Anlatımı aç',
  },
  kavram: {
    ipucu: 'Kavramlar karışıyor. Eşleştirme, doğru-yanlış ve boşluk doldurma etkinlikleri kavramları ayırmanı sağlar.',
    eylem: 'etkinlik',
    etiket: 'Etkinliklere git',
  },
  islem: {
    ipucu: 'Hesaplamada kayıp var. Birimleri yazarak, adım adım çöz; çözümlü soruları inceleyip benzerlerini tekrar dene.',
    eylem: 'test',
    etiket: 'İşlem sorusu çöz',
  },
  dikkat: {
    ipucu: 'Bildiğin halde kaçırıyorsun. Soru kökündeki "değildir, yanlıştır, en az" gibi ifadelerin altını çiz; şıkları bitirmeden işaretleme.',
    eylem: 'hata',
    etiket: 'Hataları tekrar çöz',
  },
  sure: {
    ipucu: 'Süre yetmiyor. Önce emin olduklarını çöz, takıldığını işaretleyip sona bırak; karma testleri süre tutarak çöz.',
    eylem: 'test',
    etiket: 'Test çöz',
  },
}

export type KonuAnalizi = {
  grade: number
  konu: Konu
  durum: LearningStatus
  testSayisi: number
  sonBasari: number | null
  ortalama: number | null
  seviyeBasari: { seviye: string; basari: number }[]
  acikHata: number
  nedenler: { neden: HataNedeni; ad: string; sayi: number }[]
  nedenSorulmamis: number
  adimlar: Oneri[]
}

const GUN = 86_400_000

function ortalamaBasari(list: TestSonucu[]) {
  const dogru = list.reduce((s, r) => s + r.dogru, 0)
  const toplam = list.reduce((s, r) => s + r.toplam, 0)
  return toplam ? Math.round((dogru / toplam) * 100) : null
}

function durumOf(grade: number, kod: string): { status: LearningStatus; learnedAt: string | null } {
  const rec = loadLearningProgress().find(r => r.grade === grade && r.topicId === konuId(grade, kod))
  return { status: rec?.status ?? 'not_started', learnedAt: rec?.learnedAt ?? null }
}

export function konuAnalizi(grade: number, kod: string, hatalar: HataKaydi[], now = Date.now()): KonuAnalizi | null {
  const found = konuBul(grade, kod)
  if (!found) return null
  const { konu } = found
  const sonuclar = sonuclariYukle().filter(r => r.grade === grade && r.konuKod === kod)
  const son = sonuclar[sonuclar.length - 1]
  const { status, learnedAt } = durumOf(grade, kod)

  const seviyeBasari = (['Kolay', 'Orta', 'Zor'] as const)
    .map(seviye => {
      const list = sonuclar.filter(r => r.seviye === seviye)
      const avg = ortalamaBasari(list)
      return avg === null ? null : { seviye, basari: avg }
    })
    .filter((x): x is { seviye: 'Kolay' | 'Orta' | 'Zor'; basari: number } => x !== null)

  const konuHatalari = hatalar.filter(h => h.grade === grade && h.konuKod === kod && h.durum === 'acik')
  const sayac = new Map<HataNedeni, number>()
  for (const h of konuHatalari) if (h.neden) sayac.set(h.neden, (sayac.get(h.neden) ?? 0) + 1)
  const nedenler = [...sayac.entries()]
    .map(([neden, sayi]) => ({ neden, ad: NEDEN_AD[neden], sayi }))
    .sort((a, b) => b.sayi - a.sayi)

  const adimlar: Oneri[] = []
  const ekle = (o: Omit<Oneri, 'id'>) => adimlar.push({ ...o, id: `${grade}-${kod}-${adimlar.length}` })
  const ad = konu.ad

  if (sonuclar.length === 0) {
    if (konu.anlatim) {
      ekle({ oncelik: 1, baslik: 'Önce anlatımı oku', detay: `${ad} konusunun anlatımını oku, örnekleri kendin çözmeye çalış.`, eylem: { tur: 'anlatim', grade, kod }, etiket: 'Anlatımı aç' })
    }
    ekle({ oncelik: 2, baslik: 'Kolay testle başla', detay: 'Anlatımdan sonra kolay seviyedeki testi çöz; %70 ve üstü konuyu "öğrenildi" yapar.', eylem: { tur: 'test', grade, kod }, etiket: 'Teste git' })
  } else {
    const ort = ortalamaBasari(sonuclar) ?? 0
    const kolay = seviyeBasari.find(s => s.seviye === 'Kolay')
    if (kolay && kolay.basari < GECME_ORANI) {
      ekle({ oncelik: 1, baslik: 'Temeli sağlamlaştır', detay: `Kolay seviyede başarın %${kolay.basari}. Zor sorulara geçmeden anlatıma dönüp kolay testi tekrar çöz.`, eylem: { tur: 'anlatim', grade, kod }, etiket: 'Anlatımı aç' })
    } else if (ort < GECME_ORANI) {
      ekle({ oncelik: 1, baslik: 'Hedef %70', detay: `Bu konuda ortalaman %${ort}. Yanlışlarını hata defterinde çöz, sonra testi tekrar dene.`, eylem: { tur: 'test', grade, kod }, etiket: 'Testi tekrar çöz' })
    }
    const zorlar = konu.seviyeler.filter(Boolean) as string[]
    const sonraki = zorlar.find(sv => !seviyeBasari.some(s => s.seviye === sv && s.basari >= GECME_ORANI))
    if (sonraki && (!kolay || kolay.basari >= GECME_ORANI)) {
      ekle({ oncelik: 3, baslik: `${sonraki} seviyeye geç`, detay: `Bir üst seviyede kendini dene.`, eylem: { tur: 'test', grade, kod }, etiket: `${sonraki} test` })
    }
  }

  if (nedenler.length) {
    const baskin = nedenler[0]
    const t = NEDEN_TAVSIYE[baskin.neden]
    ekle({
      oncelik: 2,
      baslik: `En sık neden: ${baskin.ad.toLocaleLowerCase('tr')}`,
      detay: t.ipucu,
      eylem: t.eylem === 'hata' ? { tur: 'hata' } : { tur: t.eylem, grade, kod },
      etiket: t.etiket,
    })
  } else if (konuHatalari.length) {
    ekle({ oncelik: 2, baslik: `${konuHatalari.length} açık hatan var`, detay: 'Hata defterinde her yanlış için nedenini seç; koç ona göre yol gösterir.', eylem: { tur: 'hata' }, etiket: 'Hata defteri' })
  }

  if (konu.etkinlik > 0 && !adimlar.some(a => a.eylem.tur === 'etkinlik')) {
    ekle({ oncelik: 4, baslik: 'Etkinliklerle pekiştir', detay: `${konu.etkinlik} etkinlik var; kavramları oyun gibi tekrar etmenin en hızlı yolu.`, eylem: { tur: 'etkinlik', grade, kod }, etiket: 'Etkinliklere git' })
  }

  if (status === 'learned' && learnedAt) {
    const gun = Math.floor((now - new Date(learnedAt).getTime()) / GUN)
    if (gun >= 7) {
      ekle({ oncelik: 1, baslik: 'Kalıcılık testi zamanı', detay: `Bu konuyu ${gun} gün önce öğrendin. Şimdi %70 alırsan "kalıcı" olur.`, eylem: { tur: 'test', grade, kod }, etiket: 'Testi çöz' })
    } else {
      ekle({ oncelik: 5, baslik: 'Tekrar zamanı yaklaşıyor', detay: `${7 - gun} gün sonra bu konunun kalıcılık testini çöz.`, eylem: { tur: 'etkinlik', grade, kod }, etiket: 'Kısa tekrar' })
    }
  }

  adimlar.sort((a, b) => a.oncelik - b.oncelik)

  return {
    grade,
    konu,
    durum: status,
    testSayisi: sonuclar.length,
    sonBasari: son ? basari(son) : null,
    ortalama: ortalamaBasari(sonuclar),
    seviyeBasari,
    acikHata: konuHatalari.length,
    nedenler,
    nedenSorulmamis: konuHatalari.filter(h => !h.neden).length,
    adimlar,
  }
}

export type KonuOzeti = { grade: number; kod: string; ad: string; ortalama: number; test: number }

export type GenelAnaliz = {
  oneriler: Oneri[]
  zayif: KonuOzeti[]
  guclu: KonuOzeti[]
  nedenler: { neden: HataNedeni; ad: string; sayi: number }[]
  acikHata: number
  testSayisi: number
  ortalama: number | null
  aktifGun7: number
}

export function genelAnaliz(grades: number[], hatalar: HataKaydi[], now = Date.now()): GenelAnaliz {
  const sonuclar = sonuclariYukle().filter(r => grades.includes(r.grade))
  const progress = loadLearningProgress().filter(r => grades.includes(r.grade))
  const acik = hatalar.filter(h => grades.includes(h.grade) && h.durum === 'acik')

  // Konu bazında başarı
  const konular: KonuOzeti[] = []
  for (const grade of grades) {
    for (const { konu } of tumKonular(grade)) {
      const list = sonuclar.filter(r => r.grade === grade && r.konuKod === konu.kod)
      const ort = ortalamaBasari(list)
      if (ort !== null) konular.push({ grade, kod: konu.kod, ad: konu.ad, ortalama: ort, test: list.length })
    }
  }
  const zayif = konular.filter(k => k.ortalama < GECME_ORANI).sort((a, b) => a.ortalama - b.ortalama)
  const guclu = konular.filter(k => k.ortalama >= 85).sort((a, b) => b.ortalama - a.ortalama)

  const sayac = new Map<HataNedeni, number>()
  for (const h of acik) if (h.neden) sayac.set(h.neden, (sayac.get(h.neden) ?? 0) + 1)
  const nedenler = [...sayac.entries()]
    .map(([neden, sayi]) => ({ neden, ad: NEDEN_AD[neden], sayi }))
    .sort((a, b) => b.sayi - a.sayi)

  const gunler = new Set(
    sonuclar.filter(r => now - new Date(r.tarih).getTime() < 7 * GUN).map(r => r.tarih.slice(0, 10))
  )

  const oneriler: Oneri[] = []
  const ekle = (o: Omit<Oneri, 'id'>) => oneriler.push({ ...o, id: `g-${oneriler.length}` })

  // 1) Kalıcılık testi zamanı gelen konular
  for (const p of progress) {
    if (p.status !== 'learned' || !p.learnedAt) continue
    const gun = Math.floor((now - new Date(p.learnedAt).getTime()) / GUN)
    const kod = p.topicId.slice(String(p.grade).length + 1)
    if (gun >= 7 && konuBul(p.grade, kod)) {
      ekle({ oncelik: 1, baslik: `Kalıcılık testi: ${p.topicTitle}`, detay: `${gun} gün önce öğrendin. Şimdi bir test çöz; %70 alırsan konu kalıcı olur.`, eylem: { tur: 'test', grade: p.grade, kod }, etiket: 'Testi çöz' })
    }
  }

  // 2) En zayıf konu
  if (zayif[0]) {
    const z = zayif[0]
    ekle({ oncelik: 2, baslik: `En çok zorlandığın konu: ${z.ad}`, detay: `Ortalaman %${z.ortalama}. Anlatıma dönüp kolay testten yeniden başla.`, eylem: { tur: 'anlatim', grade: z.grade, kod: z.kod }, etiket: 'Konuya git' })
  }

  // 3) Hata nedenine göre alışkanlık önerisi
  if (nedenler[0] && nedenler[0].sayi >= 2) {
    const t = NEDEN_TAVSIYE[nedenler[0].neden]
    ekle({ oncelik: 3, baslik: `Hatalarının çoğu: ${nedenler[0].ad.toLocaleLowerCase('tr')}`, detay: t.ipucu, eylem: { tur: 'hata' }, etiket: 'Hata defteri' })
  } else if (acik.length >= 3) {
    ekle({ oncelik: 3, baslik: `${acik.length} açık hatan var`, detay: 'Yanlışlarını tekrar çözmek yeni soru çözmekten daha çok kazandırır.', eylem: { tur: 'hata' }, etiket: 'Hata defteri' })
  }

  // 4) Çalışılmış ama testi çözülmemiş konu
  const testsiz = progress.find(p => p.status === 'studied' && !sonuclar.some(r => r.grade === p.grade && `${r.grade}-${r.konuKod}` === p.topicId))
  if (testsiz) {
    const kod = testsiz.topicId.slice(String(testsiz.grade).length + 1)
    if (konuBul(testsiz.grade, kod)) {
      ekle({ oncelik: 4, baslik: `${testsiz.topicTitle} için test çöz`, detay: 'Konuyu çalıştın ama henüz kendini ölçmedin.', eylem: { tur: 'test', grade: testsiz.grade, kod }, etiket: 'Teste git' })
    }
  }

  // 5) Hiç başlamamışsa ya da yeni konu sırası
  if (oneriler.length < 3) {
    for (const grade of grades) {
      const yeni = tumKonular(grade).find(({ konu }) => !progress.some(p => p.grade === grade && p.topicId === konuId(grade, konu.kod)))
      if (yeni) {
        ekle({ oncelik: 5, baslik: `Yeni konu: ${yeni.konu.ad}`, detay: `${grade}. sınıf · ${yeni.bolum.ad}. Anlatımla başla, ardından kolay testi çöz.`, eylem: { tur: 'anlatim', grade, kod: yeni.konu.kod }, etiket: 'Başla' })
        break
      }
    }
  }

  oneriler.sort((a, b) => a.oncelik - b.oncelik)

  return {
    oneriler: oneriler.slice(0, 4),
    zayif: zayif.slice(0, 5),
    guclu: guclu.slice(0, 5),
    nedenler,
    acikHata: acik.length,
    testSayisi: sonuclar.length,
    ortalama: ortalamaBasari(sonuclar),
    aktifGun7: gunler.size,
  }
}
