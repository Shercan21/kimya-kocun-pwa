import { tamGorselSoru, soruGorunumHtml } from '../data/questionDisplay'
import { useEffect, useState } from 'react'
import Icon from './Icon'
import { icerikHtml } from '../data/content'
import { purposes, type StudyPurpose } from '../data/profile'
import { useBackStep } from '../data/backNav'
import {
  SORU_PER_KAZANIM,
  taramaDegerlendir,
  taramaHazirla,
  taramaKaydet,
  useTaramaSonucu,
  type TaramaSonucu,
  type TaramaSorusu,
} from '../data/screening'

type Props = {
  grade: number
  onChoosePlan: (purpose: StudyPurpose) => void
}

const harf = ['A', 'B', 'C', 'D', 'E', 'F']

function Html({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: icerikHtml(html) }} />
}

const DURUM = {
  eksik: { ad: 'Eksik', cls: 'eksik' },
  kismen: { ad: 'Kısmen', cls: 'kismen' },
  tamam: { ad: 'Biliyor', cls: 'tamam' },
} as const

function Sonuc({
  sonuc,
  onChoosePlan,
  onRestart,
}: {
  sonuc: TaramaSonucu
  onChoosePlan: (p: StudyPurpose) => void
  onRestart: () => void
}) {
  const [plan, setPlan] = useState<StudyPurpose | null>(null)
  const oran = sonuc.toplam ? Math.round((sonuc.dogru / sonuc.toplam) * 100) : 0
  const eksik = sonuc.konular.filter(k => k.durum === 'eksik')
  const kismen = sonuc.konular.filter(k => k.durum === 'kismen')
  const tamam = sonuc.konular.filter(k => k.durum === 'tamam')
  const kzEksik = sonuc.kazanimlar.filter(k => k.dogru < k.toplam)

  const liste = (items: typeof eksik, durum: keyof typeof DURUM) =>
    items.length > 0 && (
      <ul className="coach-list">
        {items.map(k => (
          <li key={k.kod} className="tarama-satir">
            <span>
              {k.kod} · {k.ad}
              <small>{k.dogru} / {k.toplam} doğru</small>
            </span>
            <b className={`tarama-etiket ${DURUM[durum].cls}`}>{DURUM[durum].ad}</b>
          </li>
        ))}
      </ul>
    )

  return (
    <div className="stack">
      <section className="card result-card">
        <small>{sonuc.grade}. sınıf eksik taraması · {new Date(sonuc.tarih).toLocaleDateString('tr-TR')}</small>
        <h2>%{oran} başarı</h2>
        <div className="result-stats">
          <span className="ok">{sonuc.dogru} doğru</span>
          <span className="bad">{sonuc.toplam - sonuc.dogru} yanlış / boş</span>
        </div>
        <p className="muted">
          {eksik.length + kismen.length === 0
            ? 'Harika! Taramada eksik konu çıkmadı.'
            : `${eksik.length} konuda eksik, ${kismen.length} konuda kısmen eksik var. Aşağıdan planını seçerek çalışmaya başla.`}
        </p>
      </section>

      {eksik.length > 0 && (
        <section className="card">
          <h3 className="card-title"><Icon name="target" /> Eksik konular</h3>
          <p className="muted small">İki sorunun ikisini de yapamadığın konular. Önce bunlardan başla.</p>
          {liste(eksik, 'eksik')}
        </section>
      )}

      {kismen.length > 0 && (
        <section className="card">
          <h3 className="card-title"><Icon name="repeat" /> Kısmen bildiğin konular</h3>
          {liste(kismen, 'kismen')}
        </section>
      )}

      {tamam.length > 0 && (
        <section className="card">
          <h3 className="card-title"><Icon name="star" /> Bildiğin konular</h3>
          {liste(tamam, 'tamam')}
        </section>
      )}

      {kzEksik.length > 0 && (
        <details className="card tarama-kazanim">
          <summary>Kazanım bazında sonuçlar ({kzEksik.length} kazanımda eksik)</summary>
          <ul>
            {sonuc.kazanimlar.map(k => (
              <li key={k.kazanim} className={k.dogru < k.toplam ? 'is-eksik' : ''}>
                <b>{k.kazanim}</b> {k.ad} <span>{k.dogru}/{k.toplam}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="card plan-sec">
        <h3 className="card-title"><Icon name="route" /> Şimdi planını seç</h3>
        <p className="muted small">Sonuçlarına göre nasıl devam etmek istersin? Seçtiğin plana göre uygulama yeniden düzenlenir; bildiğin konular kilitsiz açılır.</p>
        <div className="ob-options">
          {purposes
            .filter(p => p.id !== 'gaps')
            .map(p => (
              <button
                key={p.id}
                type="button"
                className={plan === p.id ? 'ob-option is-selected' : 'ob-option'}
                aria-pressed={plan === p.id}
                onClick={() => setPlan(p.id)}
              >
                <span>
                  {p.title}
                  <small>{p.detail}</small>
                </span>
              </button>
            ))}
        </div>
        <div className="row-actions start">
          <button type="button" className="primary-button" disabled={!plan} onClick={() => plan && onChoosePlan(plan)}>
            Bu planla devam et
          </button>
          <button type="button" className="btn-secondary" onClick={onRestart}>Taramayı yeniden yap</button>
        </div>
      </section>
    </div>
  )
}

export default function ScreeningPage({ grade, onChoosePlan }: Props) {
  const kayitli = useTaramaSonucu(grade)
  const draftKey = 'kimya-kocun-pwa-screening-draft-v1:' + grade
  const [draft] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem(draftKey) ?? 'null'); return d && Array.isArray(d.sorular) && d.sorular.length && d.cevaplar && typeof d.cevaplar === 'object' ? d as { sorular: TaramaSorusu[]; cevaplar: Record<number,number>; index: number } : null } catch { return null }
  })
  const [sorular, setSorular] = useState<TaramaSorusu[] | null>(draft?.sorular ?? null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [index, setIndex] = useState(draft?.index ?? 0)
  const [cevaplar, setCevaplar] = useState<Record<number, number>>(draft?.cevaplar ?? {})
  const [onay, setOnay] = useState(false)

  const [cikisSor, setCikisSor] = useState(false)
  useEffect(() => {
    if (!sorular) return
    try { localStorage.setItem(draftKey, JSON.stringify({ sorular, cevaplar, index })) } catch { setHata('Tarama taslağı kaydedilemedi. Kapatmadan tamamlamanı öneririz.') }
  }, [sorular, cevaplar, index, draftKey])
  function kapat() {
    setSorular(null)
    setCevaplar({})
    setIndex(0)
    setCikisSor(false)
  }
  function cikmayiDene() {
    if (Object.keys(cevaplar).length > 0) setCikisSor(true)
    else kapat()
  }
  useBackStep(!!sorular, () => {
    if (cikisSor) setCikisSor(false)
    else cikmayiDene()
  })

  async function basla() {
    setYukleniyor(true)
    setHata('')
    try {
      const list = await taramaHazirla(grade)
      if (!list.length) throw new Error('bos')
      localStorage.removeItem(draftKey)
      setSorular(list)
      setCevaplar({})
      setIndex(0)
      setOnay(false)
      window.scrollTo({ top: 0 })
    } catch {
      setHata('Sorular yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.')
    } finally {
      setYukleniyor(false)
    }
  }

  function bitir() {
    if (!sorular) return
    taramaKaydet(taramaDegerlendir(grade, sorular, cevaplar))
    localStorage.removeItem(draftKey)
    setSorular(null)
    window.scrollTo({ top: 0 })
  }

  if (sorular) {
    const soru = sorular[index]
    const cevaplanan = Object.keys(cevaplar).length
    return (
      <div className="stack">
        {cikisSor && (
          <div className="modal-backdrop" role="presentation" onClick={() => setCikisSor(false)}>
            <div className="modal konu-onay" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
              <div className="modal-body">
                <h3>Taramadan çıkmak istiyor musun?</h3>
                <p>{cevaplanan} soruyu cevapladın. Cevapların bu cihazda taslak olarak saklanır; tarama sayfasını yeniden açarak devam edebilirsin.</p>
              </div>
              <div className="modal-foot">
                <div className="row-actions">
                  <button type="button" className="btn-secondary" onClick={kapat}>Çık</button>
                  <button type="button" className="primary-button" onClick={() => setCikisSor(false)}>Taramaya devam et</button>
                </div>
              </div>
            </div>
          </div>
        )}
        <section className="card test-card">
          <div className="test-head">
            <button type="button" className="btn-ghost" onClick={cikmayiDene} aria-label="Taramadan çık">×</button>
            <div>
              <small>{grade}. sınıf eksik taraması · {soru.kazanim}</small>
              <b>{index + 1} / {sorular.length}</b>
            </div>
            <span className="muted small">{cevaplanan} cevaplandı</span>
          </div>
          <div className="test-dots" role="group" aria-label="Sorular">
            {sorular.map((_, i) => (
              <button
                key={i}
                type="button"
                className={[i === index ? 'is-current' : '', cevaplar[i] !== undefined ? 'is-answered' : ''].join(' ')}
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}. soru`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Html className="soru-metni" html={soruGorunumHtml(soru.soru)} />
          <ol className={`siklar${tamGorselSoru(soru.soru) ? ' gorsel-siklar' : ''}`}>
            {soru.soru.sik.map((sik, j) => (
              <li key={j}>
                <button
                  type="button"
                  className={cevaplar[index] === j ? 'is-selected' : ''}
                  aria-pressed={cevaplar[index] === j}
                  onClick={() =>
                    setCevaplar(prev => {
                      const next = { ...prev }
                      if (next[index] === j) delete next[index]
                      else next[index] = j
                      return next
                    })
                  }
                >
                  <span className="harf">{harf[j]}</span>
                  {!tamGorselSoru(soru.soru) && <Html html={sik} />}
                </button>
              </li>
            ))}
          </ol>
          <div className="test-nav">
            <button type="button" className="btn-secondary" disabled={index === 0} onClick={() => setIndex(i => i - 1)}>
              ‹ Önceki
            </button>
            {index < sorular.length - 1 ? (
              <button type="button" className="primary-button" onClick={() => setIndex(i => i + 1)}>
                Sonraki ›
              </button>
            ) : onay || cevaplanan === sorular.length ? (
              <button type="button" className="primary-button" onClick={bitir}>Taramayı bitir</button>
            ) : (
              <button type="button" className="primary-button" onClick={() => setOnay(true)}>Bitir</button>
            )}
          </div>
          {onay && cevaplanan < sorular.length && (
            <p className="muted small">{sorular.length - cevaplanan} soru boş. Yine de bitirmek için "Taramayı bitir"e bas; boşlar yanlış sayılır.</p>
          )}
        </section>
      </div>
    )
  }

  if (kayitli) {
    return <Sonuc sonuc={kayitli} onChoosePlan={onChoosePlan} onRestart={basla} />
  }

  return (
    <div className="stack">
      <section className="card">
        <h3 className="card-title"><Icon name="target" /> {grade}. sınıf eksik taraması</h3>
        <p>
          Sınıfının her kazanımından {SORU_PER_KAZANIM} soru gelecek. Test gibi çöz; bilmediğin soruyu boş bırakabilirsin.
          Sonunda hangi konularda eksiğin olduğunu göreceksin ve ona göre planını seçeceksin.
        </p>
        {hata && <p className="form-error">{hata}</p>}
        <button type="button" className="primary-button" disabled={yukleniyor} onClick={basla}>
          {yukleniyor ? 'Sorular hazırlanıyor…' : 'Taramaya başla'}
        </button>
      </section>
    </div>
  )
}
