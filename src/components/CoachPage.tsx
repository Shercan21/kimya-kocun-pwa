import { useMemo, useState } from 'react'
import Icon from './Icon'
import { tumKonular } from '../data/content'
import { useHataDefteri } from '../data/mistakes'
import {
  genelAnaliz,
  konuAnalizi,
  NEDEN_TAVSIYE,
  type Eylem,
  type Oneri,
} from '../data/coach'

type Props = {
  grades: number[]
  onAction: (eylem: Eylem) => void
}

const DURUM_AD = {
  not_started: 'Başlanmadı',
  studied: 'Çalışıldı',
  learned: 'Öğrenildi',
  permanent: 'Kalıcı',
} as const

function OneriKart({ oneri, onAction }: { oneri: Oneri; onAction: (e: Eylem) => void }) {
  return (
    <li className="coach-tip">
      <div>
        <b>{oneri.baslik}</b>
        <p>{oneri.detay}</p>
      </div>
      <button type="button" className="btn-secondary" onClick={() => onAction(oneri.eylem)}>
        {oneri.etiket}
      </button>
    </li>
  )
}

export default function CoachPage({ grades, onAction }: Props) {
  const hatalar = useHataDefteri()
  const [now] = useState(() => Date.now())
  const genel = useMemo(() => genelAnaliz(grades, hatalar, now), [grades, hatalar, now])

  const secenekler = useMemo(
    () => grades.flatMap(grade => tumKonular(grade).map(({ konu }) => ({ grade, kod: konu.kod, ad: konu.ad }))),
    [grades]
  )
  const [secili, setSecili] = useState<string>('')
  const [grade, kod] = secili ? [Number(secili.split('|')[0]), secili.split('|')[1]] : [null, null]
  const analiz = useMemo(
    () => (grade !== null && kod ? konuAnalizi(grade, kod, hatalar, now) : null),
    [grade, kod, hatalar, now]
  )

  function sec(g: number, k: string) {
    setSecili(`${g}|${k}`)
    document.getElementById('coach-konu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const baskinNeden = genel.nedenler[0]
  const toplamNeden = genel.nedenler.reduce((s, n) => s + n.sayi, 0)

  return (
    <div className="today-grid">
      <div className="col">
        <section className="card coach-hero">
          <h3 className="card-title">
            <Icon name="target" />
            Koçun diyor ki
          </h3>
          <p className="muted small">
            {genel.testSayisi === 0
              ? 'Henüz test çözmedin. Aşağıdaki adımla başla; çözdükçe sana özel öneriler burada belirecek.'
              : `Son 7 günde ${genel.aktifGun7} gün çalıştın · toplam ${genel.testSayisi} test · ortalama %${genel.ortalama ?? 0}`}
          </p>
          {genel.oneriler.length > 0 ? (
            <ol className="coach-tips">
              {genel.oneriler.map(o => (
                <OneriKart key={o.id} oneri={o} onAction={onAction} />
              ))}
            </ol>
          ) : (
            <p className="muted">Harika gidiyorsun; şu an öncelikli bir önerim yok.</p>
          )}
        </section>

        <section className="card" id="coach-konu">
          <h3 className="card-title">
            <Icon name="route" />
            Takıldığın bir konu mu var?
          </h3>
          <label className="coach-select">
            <span className="muted small">Konuyu seç, sana adım adım ne yapacağını söyleyeyim.</span>
            <select value={secili} onChange={e => setSecili(e.target.value)}>
              <option value="">Konu seç…</option>
              {grades.map(g => (
                <optgroup key={g} label={`${g}. sınıf`}>
                  {secenekler
                    .filter(item => item.grade === g)
                    .map(item => (
                      <option key={`${g}|${item.kod}`} value={`${g}|${item.kod}`}>
                        {item.kod} · {item.ad}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>

          {analiz && (
            <div className="coach-analysis">
              <div className="stats">
                <div className="stat"><small>Durum</small><b>{DURUM_AD[analiz.durum]}</b></div>
                <div className="stat"><small>Test</small><b>{analiz.testSayisi}</b></div>
                <div className="stat"><small>Ortalama</small><b>{analiz.ortalama === null ? '—' : `%${analiz.ortalama}`}</b></div>
                <div className="stat"><small>Açık hata</small><b>{analiz.acikHata}</b></div>
              </div>

              {analiz.seviyeBasari.length > 0 && (
                <div className="coach-levels">
                  {analiz.seviyeBasari.map(s => (
                    <div key={s.seviye} className="coach-level">
                      <span>{s.seviye}</span>
                      <div className="bar"><i style={{ width: `${s.basari}%` }} className={s.basari >= 70 ? 'ok' : ''} /></div>
                      <b>%{s.basari}</b>
                    </div>
                  ))}
                </div>
              )}

              {analiz.nedenSorulmamis > 0 && (
                <p className="muted small">
                  {analiz.nedenSorulmamis} hatanın nedenini henüz seçmedin. Hata defterinde seçersen öneriler daha isabetli olur.
                </p>
              )}

              <h4 className="coach-sub">Ne yapmalısın?</h4>
              <ol className="coach-tips numbered">
                {analiz.adimlar.map(o => (
                  <OneriKart key={o.id} oneri={o} onAction={onAction} />
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>

      <div className="col">
        <section className="card">
          <h3 className="card-title">
            <Icon name="notebook" />
            Hatalarının nedeni
          </h3>
          {toplamNeden === 0 ? (
            <p className="muted">
              {genel.acikHata
                ? `${genel.acikHata} açık hatan var ama nedenlerini seçmemişsin. Test sonunda "Neden yanlış yaptın?" sorusunu cevaplarsan sana göre tavsiye veririm.`
                : 'Test çözdükçe hatalarının nedenini burada göreceksin.'}
            </p>
          ) : (
            <>
              <div className="coach-reasons">
                {genel.nedenler.map(n => (
                  <div key={n.neden} className="coach-level">
                    <span>{n.ad}</span>
                    <div className="bar"><i style={{ width: `${Math.round((n.sayi / toplamNeden) * 100)}%` }} /></div>
                    <b>{n.sayi}</b>
                  </div>
                ))}
              </div>
              {baskinNeden && <p className="coach-advice">{NEDEN_TAVSIYE[baskinNeden.neden].ipucu}</p>}
            </>
          )}
        </section>

        <section className="card">
          <h3 className="card-title">
            <Icon name="chart" />
            Zorlandığın konular
          </h3>
          {genel.zayif.length === 0 ? (
            <p className="muted">%70'in altında kaldığın konu yok.</p>
          ) : (
            <ul className="coach-list">
              {genel.zayif.map(k => (
                <li key={`${k.grade}-${k.kod}`}>
                  <button type="button" onClick={() => sec(k.grade, k.kod)}>
                    <span>{k.ad}<small>{k.grade}. sınıf · {k.test} test</small></span>
                    <b className="low">%{k.ortalama}</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {genel.guclu.length > 0 && (
          <section className="card">
            <h3 className="card-title">
              <Icon name="star" />
              Güçlü olduğun konular
            </h3>
            <ul className="coach-list">
              {genel.guclu.map(k => (
                <li key={`${k.grade}-${k.kod}`}>
                  <button type="button" onClick={() => sec(k.grade, k.kod)}>
                    <span>{k.ad}<small>{k.grade}. sınıf · {k.test} test</small></span>
                    <b className="high">%{k.ortalama}</b>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
