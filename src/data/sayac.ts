// Anonim ziyaret sayacı (GoatCounter, shercankimya hesabı).
// Çerez kullanmaz, kişisel veri göndermez; yalnız hangi uygulama sayfasının açıldığını sayar.
// Öğretmen hesabının ziyaretleri sayılmaz.
import { isTeacher, readHesap } from './cloud'

const SAYAC_URL = 'https://shercankimya.goatcounter.com/count'
const SCRIPT_URL = 'https://gc.zgo.at/count.js'

type GoatCounter = { count: (vars: { path: string; title?: string; event?: boolean }) => void }
declare global {
  interface Window {
    goatcounter?: GoatCounter & { no_onload?: boolean; endpoint?: string }
  }
}

let yuklendi: Promise<void> | null = null

function yukle(): Promise<void> {
  if (yuklendi) return yuklendi
  yuklendi = new Promise(resolve => {
    window.goatcounter = { ...(window.goatcounter ?? {}), no_onload: true } as Window['goatcounter']
    const s = document.createElement('script')
    s.async = true
    s.src = SCRIPT_URL
    s.dataset.goatcounter = SAYAC_URL
    s.onload = () => resolve()
    s.onerror = () => resolve()
    document.head.appendChild(s)
  })
  return yuklendi
}

const SAYFA_AD: Record<string, string> = {
  today: 'Bugün',
  coach: 'Koç',
  program: 'Program',
  lessons: 'Dersler',
  exams: 'Sınav',
  progress: 'Gelişim',
  practice: 'Soru çöz',
  screening: 'Tarama',
  giris: 'Giriş ve kurulum',
}

export function sayfaSay(sayfa: string) {
  if (typeof window === 'undefined' || !navigator.onLine) return
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return
  if (isTeacher(readHesap())) return
  yukle().then(() => {
    try {
      window.goatcounter?.count?.({
        path: `kimya-kocun-pwa/${sayfa}`,
        title: `Kimya Koçun · ${SAYFA_AD[sayfa] ?? sayfa}`,
      })
    } catch {
      /* sayaç çalışmazsa uygulama etkilenmez */
    }
  })
}
