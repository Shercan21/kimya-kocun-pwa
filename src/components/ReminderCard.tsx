import { useState } from 'react'
import Icon from './Icon'

// Çalışma hatırlatması: sunucu gerektirmeden telefonun kendi takvimine
// tekrarlayan bir etkinlik ekler. Takvim, çalışma günlerinde seçilen saatte
// bildirim gönderir (Android ve iPhone'da çalışır, ücretsizdir).

const KEY = 'kimya-kocun-pwa-hatirlatma'
const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] // profil: 0 = Pazartesi
const SAATLER = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// Bugünden itibaren ilk çalışma gününün tarihi (yerel saatle).
function ilkGun(days: number[], saat: string): Date {
  const [h, m] = saat.split(':').map(Number)
  const d = new Date()
  for (let i = 0; i < 8; i++) {
    const c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, h, m)
    const gun = (c.getDay() + 6) % 7
    if (days.includes(gun) && c.getTime() > Date.now()) return c
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, h, m)
}

function yerel(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

export default function ReminderCard({ days, dailyMinutes }: { days: number[]; dailyMinutes: number }) {
  const [saat, setSaat] = useState(() => {
    try {
      return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as { saat?: string }).saat ?? '19:00'
    } catch {
      return '19:00'
    }
  })

  function saatSec(s: string) {
    setSaat(s)
    localStorage.setItem(KEY, JSON.stringify({ saat: s }))
  }

  const baslangic = ilkGun(days, saat)
  const bitis = new Date(baslangic.getTime() + dailyMinutes * 60_000)
  const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${[...days].sort().map(d => BYDAY[d]).join(',')}`
  const baslik = 'Kimya Koçun · çalışma zamanı'
  const aciklama = `Bugün ${dailyMinutes} dakikalık kimya çalışman var. Uygulamayı aç: https://shercan21.github.io/kimya-kocun-pwa/`

  const googleLink =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(baslik)}` +
    `&dates=${yerel(baslangic)}/${yerel(bitis)}` +
    `&recur=${encodeURIComponent(rrule)}` +
    `&details=${encodeURIComponent(aciklama)}`

  function icsIndir() {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kimya Kocun//TR',
      'BEGIN:VEVENT',
      `UID:kimya-kocun-pwa-${Date.now()}@shercan21.github.io`,
      `DTSTAMP:${yerel(new Date())}`,
      `DTSTART:${yerel(baslangic)}`,
      `DTEND:${yerel(bitis)}`,
      rrule,
      `SUMMARY:${baslik}`,
      `DESCRIPTION:${aciklama}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${baslik}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'kimya-kocun-pwa-hatirlatma.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  if (!days.length) return null

  return (
    <section className="card reminder-card">
      <h3 className="card-title">
        <Icon name="calendar" />
        Çalışma hatırlatması
      </h3>
      <p className="muted small">
        Çalışma günlerinde seçtiğin saatte telefonun sana bildirim göndersin. Hatırlatma telefonunun kendi takvimine
        eklenir; istediğin zaman takvimden silebilirsin.
      </p>
      <div className="ob-days" role="group" aria-label="Saat">
        {SAATLER.map(s => (
          <button
            key={s}
            type="button"
            className={saat === s ? 'chip is-active' : 'chip'}
            aria-pressed={saat === s}
            onClick={() => saatSec(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="row-actions start">
        <a className="primary-button" href={googleLink} target="_blank" rel="noopener noreferrer">
          Google Takvim'e ekle
        </a>
        <button type="button" className="btn-secondary" onClick={icsIndir}>
          iPhone / diğer takvimler
        </button>
      </div>
      <p className="muted small">
        Çalışma günlerini değiştirirsen hatırlatmayı da yeniden ekle (eskisini takviminden sil).
      </p>
    </section>
  )
}
