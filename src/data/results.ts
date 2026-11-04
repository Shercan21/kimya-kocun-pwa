// Test sonuçları ve öğrenme durumuna etkisi (plan §7, §8).

import { getTopicProgress, setTopicProgress } from './learningProgress'
import { localDate } from './studyTasks'

export type TestSonucu = {
  id: string
  grade: number
  konuKod: string | null // karma testlerde boş
  testId: string
  seviye: string | null
  tur: string
  dogru: number
  yanlis: number
  bos: number
  toplam: number
  yanlisSorular: number[] // test içindeki soru sıraları (Hata Defteri için)
  kazanimlar?: Record<string, [number, number]> // kazanım → [doğru, toplam]
  tarih: string
}

const KEY = 'kimya-kocun-pwa-test-sonuclari-v1'
export const GECME_ORANI = 70

export function sonuclariYukle(): TestSonucu[] {
  try {
    const raw = localStorage.getItem(KEY)
    const data: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(data) ? (data as TestSonucu[]) : []
  } catch {
    return []
  }
}

export function konuSonuclari(grade: number, kod: string) {
  return sonuclariYukle().filter(item => item.grade === grade && item.konuKod === kod)
}

export function testSonuclari(grade: number, testId: string, seviye: string | null) {
  return sonuclariYukle().filter(
    item => item.grade === grade && item.testId === testId && item.seviye === seviye
  )
}

// Seviyesinden bağımsız olarak bir testin bütün sonuçları (sarmal testlerin seviyeleri var).
export function testinSonuclari(grade: number, testId: string) {
  return sonuclariYukle().filter(item => item.grade === grade && item.testId === testId)
}

export function basari(sonuc: Pick<TestSonucu, 'dogru' | 'toplam'>) {
  return sonuc.toplam ? Math.round((sonuc.dogru / sonuc.toplam) * 100) : 0
}

// Sonucu kaydeder ve konunun öğrenme durumunu günceller:
// - her deneme konuyu en az "çalışıldı" yapar,
// - %70 ve üzeri → "öğrenildi",
// - öğrenildikten en az 7 gün sonra yine %70 ve üzeri → "kalıcı öğrenildi".
export function sonucKaydet(
  sonuc: Omit<TestSonucu, 'id' | 'tarih'>,
  konuBaslik: string | null
): TestSonucu {
  const kayit: TestSonucu = { ...sonuc, id: crypto.randomUUID(), tarih: new Date().toISOString() }
  try {
    localStorage.setItem(KEY, JSON.stringify([...sonuclariYukle(), kayit]))
  } catch {
    // Depolama doluysa sonuç yalnızca ekranda gösterilir.
  }

  if (sonuc.konuKod && konuBaslik) {
    const topicId = `${sonuc.grade}-${sonuc.konuKod}`
    const mevcut = getTopicProgress(sonuc.grade, topicId)?.status ?? 'not_started'
    const gecti = basari(kayit) >= GECME_ORANI
    if (gecti && mevcut === 'learned') {
      const learnedAt = getTopicProgress(sonuc.grade, topicId)?.learnedAt
      const gun = learnedAt
        ? (new Date(localDate(new Date())).getTime() - new Date(localDate(new Date(learnedAt))).getTime()) / 86_400_000
        : 0
      if (gun >= 7) setTopicProgress(sonuc.grade, topicId, konuBaslik, 'permanent')
    } else if (gecti && (mevcut === 'not_started' || mevcut === 'studied')) {
      setTopicProgress(sonuc.grade, topicId, konuBaslik, 'learned')
    } else if (mevcut === 'not_started') {
      setTopicProgress(sonuc.grade, topicId, konuBaslik, 'studied')
    }
  }

  return kayit
}
