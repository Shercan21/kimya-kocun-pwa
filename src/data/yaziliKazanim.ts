// Yazılı senaryolarında geçen kazanımlar ve bu kazanımları içeren konular.

import { useEffect, useState } from 'react'
import { tumKonular, yazililar } from './content'

export function useYaziliKonulari(grades: number[], enabled: boolean) {
  const [kodlar, setKodlar] = useState<{kodlar:Set<string>;donem:number;yazili:number} | null>(null)
  const key = grades.join(',')

  useEffect(() => {
    if (!enabled) return
    let active = true
    const list = key ? key.split(',').map(Number) : []
    Promise.all(
      list.map(grade =>
        yazililar(grade)
          .then(file => {
            let selection:Record<string,string>={}
            try {selection=JSON.parse(localStorage.getItem('kimya-kocun-pwa-yazili-secim') ?? '{}')} catch { /* default */ }
            const selected=file.sinavlar.find(s=>s.id===selection[grade]) ?? file.sinavlar[0]
            const exams=selected?file.sinavlar.filter(s=>s.donem===selected.donem&&s.yazili===selected.yazili):[]
            return {grade,codes:new Set(exams.flatMap(s=>s.sorular.map(q=>q.kazanim))),donem:selected?.donem??1,yazili:selected?.yazili??1}
          })
          .catch(() => ({ grade, codes: new Set<string>(), donem:1, yazili:1 }))
      )
    ).then(results => {
      if (!active) return
      const out = new Set<string>()
      for (const { grade, codes } of results) {
        for (const { konu } of tumKonular(grade)) {
          if (konu.kazanimlar.some(code => codes.has(code))) out.add(`${grade}|${konu.kod}`)
        }
      }
      setKodlar({kodlar:out,donem:results[0]?.donem??1,yazili:results[0]?.yazili??1})
    })
    return () => {
      active = false
    }
  }, [key, enabled])

  return kodlar
}
