import { useState } from 'react'
import Icon from './Icon'
import { konuId, sinifMufredati } from '../data/content'
import { getTopicProgress } from '../data/learningProgress'

type Props = {
  grade: number
  onOpenTopic: (kod: string) => void
  // Yalnızca bu konular gösterilir (ör. yazılı modunda yazılı konuları).
  only?: Set<string> | null
  // Kilitli konular: önceki konu tamamlanmadan açılmaz.
  locked?: Set<string>
  lockReason?: string
  // Eksik taraması sonucu: grade|kod → eksik / kısmen / tamam
  tarama?: Map<string, 'eksik' | 'kismen' | 'tamam'>
}

const TARAMA_AD = { eksik: 'Eksik', kismen: 'Kısmen', tamam: 'Biliyor' } as const

const STATUS_LABEL = {
  not_started: '',
  studied: 'Çalışıldı',
  learned: 'Öğrenildi',
  permanent: 'Kalıcı',
} as const

export default function CurriculumPage({ grade, onOpenTopic, only, locked, lockReason = 'Önceki konuyu tamamlayınca açılır', tarama }: Props) {
  const goster = (kod: string) => !only || only.has(`${grade}|${kod}`)
  const data = sinifMufredati(grade)
  const [openTema, setOpenTema] = useState<number | null>(null)

  if (!data) return null

  return (
    <div className="stack">
      {data.temalar.map(tema => {
        const konular = tema.bolumler.flatMap(bolum => bolum.konular).filter(konu => goster(konu.kod))
        if (konular.length === 0) return null
        const done = konular.filter(konu => {
          const status = getTopicProgress(grade, konuId(grade, konu.kod))?.status
          return status === 'learned' || status === 'permanent'
        }).length
        const ilkTema = data.temalar.find(t => t.bolumler.some(b => b.konular.some(k => goster(k.kod))))?.no
        const isOpen = openTema === null ? tema.no === ilkTema : openTema === tema.no

        return (
          <section key={tema.no} className="card tema-card">
            <button
              type="button"
              className="tema-head"
              onClick={() => setOpenTema(isOpen ? -1 : tema.no)}
              aria-expanded={isOpen}
            >
              <span className="tema-no">{tema.no}</span>
              <span className="tema-title">
                <small>{tema.no}. tema</small>
                {tema.ad}
              </span>
              <span className="tema-progress">
                {done}/{konular.length} konu
                <span className="mini-bar"><span style={{ width: `${(done / konular.length) * 100}%` }} /></span>
              </span>
              <Icon name="chevron" size={18} />
            </button>

            {isOpen &&
              tema.bolumler.filter(bolum => bolum.konular.some(k => goster(k.kod))).map(bolum => (
                <div key={bolum.kod} className="bolum">
                  <h3>
                    <span>{bolum.kod}</span> {bolum.ad}
                  </h3>
                  <p className="muted small">{bolum.ozet}</p>
                  <ul className="konu-list">
                    {bolum.konular.filter(k => goster(k.kod)).map(konu => {
                      const status = getTopicProgress(grade, konuId(grade, konu.kod))?.status ?? 'not_started'
                      const kilitli = locked?.has(`${grade}|${konu.kod}`) ?? false
                      const td = tarama?.get(`${grade}|${konu.kod}`)
                      return (
                        <li key={konu.kod} className={kilitli ? 'is-locked' : undefined}>
                          <button
                            type="button"
                            disabled={kilitli}
                            title={kilitli ? lockReason : undefined}
                            onClick={() => onOpenTopic(konu.kod)}
                          >
                            <span className={`dot status-dot-${status}`} />
                            <span className="konu-kod">{konu.kod}</span>
                            <span className="konu-ad">
                              {konu.ad}
                              <small>
                                {konu.anlatim ? 'Anlatım · ' : ''}
                                {konu.soru + konu.baglam.reduce((sum, test) => sum + test.soru, 0)} soru
                                {konu.etkinlik ? ` · ${konu.etkinlik} etkinlik` : ''}
                                {kilitli ? ` · ${lockReason}` : ''}
                              </small>
                            </span>
                            {td && td !== 'tamam' && status === 'not_started' && (
                              <span className={`tarama-etiket ${td}`}>{TARAMA_AD[td]}</span>
                            )}
                            {STATUS_LABEL[status] && (
                              <span className={`status-chip status-${status}`}>{STATUS_LABEL[status]}</span>
                            )}
                            {kilitli ? <Icon name="lock" size={16} /> : <span className="chev">›</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
          </section>
        )
      })}
    </div>
  )
}
