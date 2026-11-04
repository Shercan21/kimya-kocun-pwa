// Sıralı ilerleme: bir konu "öğrenildi" (testte %70 ve üstü) olmadan
// sıradaki konu açılmaz. Sıra, verilen sınıfların müfredat sırasıdır.

import { konuId, tumKonular } from './content'
import { loadLearningProgress } from './learningProgress'

export function tamamlandi(status: string | undefined) {
  return status === 'learned' || status === 'permanent'
}

// Kilitli konuların kodları (grade|kod).
export function kilitliKonular(grades: number[], bilinen: Set<string> = new Set()): Set<string> {
  const progress = loadLearningProgress()
  const durum = new Map(progress.map(p => [`${p.grade}|${p.topicId}`, p.status]))
  const kilitli = new Set<string>()
  let oncekiTamam = true
  for (const grade of grades) {
    for (const { konu } of tumKonular(grade)) {
      const biliyor = bilinen.has(`${grade}|${konu.kod}`)
      if (!oncekiTamam && !biliyor) kilitli.add(`${grade}|${konu.kod}`)
      oncekiTamam = (biliyor || tamamlandi(durum.get(`${grade}|${konuId(grade, konu.kod)}`)))
        ? oncekiTamam
        : false
    }
  }
  return kilitli
}
