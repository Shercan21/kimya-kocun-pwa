// Kişisel Hata Defteri (plan §7).
// Testlerde yanlış yapılan ya da boş bırakılan sorular burada birikir.
// Hata nedeni tek bir cevaptan tahmin edilmez; öğrenciye sorulur.

import { useSyncExternalStore } from 'react'

export type HataNedeni =
  | 'bilgi' // bilgi eksikliği
  | 'kavram' // kavram yanılgısı
  | 'islem' // matematiksel işlem hatası
  | 'dikkat' // dikkat hatası
  | 'sure' // süre yetmedi

export const NEDEN_AD: Record<HataNedeni, string> = {
  bilgi: 'Konuyu bilmiyordum',
  kavram: 'Kavramları karıştırdım',
  islem: 'İşlem hatası yaptım',
  dikkat: 'Dikkatsizlik',
  sure: 'Süre yetmedi',
}

export type HataKaydi = {
  key: string // grade|testId|testIndex|soruIndex
  grade: number
  testId: string
  testIndex: number
  soruIndex: number
  konuKod: string | null
  testBaslik: string
  tur: 'yanlis' | 'bos'
  verilen: number | null
  yanlisSayisi: number
  dogruTekrar: number
  durum: 'acik' | 'duzeltildi'
  neden: HataNedeni | null
  ilkTarih: string
  sonTarih: string
}

const KEY = 'kimya-kocun-pwa-hata-defteri-v1'
// Bir hata, tekrar çözmede bir kez doğru yapılınca "düzeltildi" olur;
// sonraki bir testte yine yanlış yapılırsa yeniden açılır.
const DUZELTME_ESIGI = 1

let cache: HataKaydi[] | null = null
const listeners = new Set<() => void>()

function read(): HataKaydi[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    const data: unknown = raw ? JSON.parse(raw) : []
    cache = Array.isArray(data) ? (data as HataKaydi[]) : []
  } catch {
    cache = []
  }
  return cache
}

function write(next: HataKaydi[]) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // depolama doluysa yalnızca bu oturumda kalır
  }
  listeners.forEach(listener => listener())
}

export function useHataDefteri() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read
  )
}

export function hataKaydiKey(grade: number, testId: string, testIndex: number, soruIndex: number) {
  return `${grade}|${testId}|${testIndex}|${soruIndex}`
}

export function acikHatalar(grades: number[]) {
  return read().filter(item => item.durum === 'acik' && grades.includes(item.grade))
}

// Test bitince çağrılır: yanlış/boş sorular deftere girer ya da yeniden açılır,
// defterde açık olup bu kez doğru yapılan sorular düzeltilmiş sayılır.
export function testSonucunuIsle(params: {
  grade: number
  testId: string
  testIndex: number
  konuKod: string | null
  testBaslik: string
  dogruCevaplar: number[]
  cevaplar: Record<number, number>
}) {
  const now = new Date().toISOString()
  const list = [...read()]
  params.dogruCevaplar.forEach((dogru, soruIndex) => {
    const key = hataKaydiKey(params.grade, params.testId, params.testIndex, soruIndex)
    const index = list.findIndex(item => item.key === key)
    const verilen = params.cevaplar[soruIndex]
    const bos = verilen === undefined
    const yanlis = !bos && verilen !== dogru

    if (!bos && !yanlis) {
      if (index >= 0 && list[index].durum === 'acik') {
        const dogruTekrar = list[index].dogruTekrar + 1
        list[index] = {
          ...list[index],
          dogruTekrar,
          durum: dogruTekrar >= DUZELTME_ESIGI ? 'duzeltildi' : 'acik',
          sonTarih: now,
        }
      }
      return
    }

    if (index >= 0) {
      list[index] = {
        ...list[index],
        tur: bos ? 'bos' : 'yanlis',
        verilen: bos ? null : verilen,
        yanlisSayisi: list[index].yanlisSayisi + 1,
        dogruTekrar: 0,
        durum: 'acik',
        sonTarih: now,
      }
    } else {
      list.push({
        key,
        grade: params.grade,
        testId: params.testId,
        testIndex: params.testIndex,
        soruIndex,
        konuKod: params.konuKod,
        testBaslik: params.testBaslik,
        tur: bos ? 'bos' : 'yanlis',
        verilen: bos ? null : verilen,
        yanlisSayisi: 1,
        dogruTekrar: 0,
        durum: 'acik',
        neden: null,
        ilkTarih: now,
        sonTarih: now,
      })
    }
  })
  write(list)
}

export function nedenKaydet(key: string, neden: HataNedeni) {
  write(read().map(item => (item.key === key ? { ...item, neden } : item)))
}

// Hata defterindeki tekrar çözmenin sonucu.
export function tekrarSonucu(key: string, dogru: boolean, verilen: number) {
  const now = new Date().toISOString()
  write(
    read().map(item => {
      if (item.key !== key) return item
      if (dogru) {
        const dogruTekrar = item.dogruTekrar + 1
        return {
          ...item,
          dogruTekrar,
          durum: dogruTekrar >= DUZELTME_ESIGI ? 'duzeltildi' : 'acik',
          sonTarih: now,
        }
      }
      return { ...item, tur: 'yanlis', verilen, yanlisSayisi: item.yanlisSayisi + 1, dogruTekrar: 0, durum: 'acik', sonTarih: now }
    })
  )
}

export function kaydiSil(key: string) {
  write(read().filter(item => item.key !== key))
}
