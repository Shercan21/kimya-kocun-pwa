import QuestionContent from './QuestionContent'
import { prepareTestAttempt, shuffleOrder, questionFingerprint, canonicalAnswers, type TestDraft } from '../data/testOrder'
import { tamGorselSoru, soruGorunumHtml } from '../data/questionDisplay'
import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useBackStep } from '../data/backNav'
import { icerikHtml, testDosyasi, testKazanimi, type Soru, type TestDosyasi } from '../data/content'
import { basari, GECME_ORANI, sonucKaydet, type TestSonucu } from '../data/results'
import {
  hataKaydiKey,
  nedenKaydet,
  NEDEN_AD,
  testSonucunuIsle,
  useHataDefteri,
  type HataNedeni,
} from '../data/mistakes'

type Props = {
  grade: number
  testId: string
  testIndex: number
  konuKod: string | null
  konuBaslik: string | null
  baslik: string
  onClose: () => void
  // Verilirse sonuç ekranında "Devam et" çıkar (ör. sıradaki rastgele test).
  onNext?: () => void
  closeLabel?: string
}

const harf = ['A', 'B', 'C', 'D', 'E', 'F']

function Html({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: icerikHtml(html) }} />
}

export default function TestRunner(props: Props) {
  return <TestAttempt key={`${props.grade}:${props.testId}:${props.testIndex}`} {...props} />
}

function TestAttempt({ grade, testId, testIndex, konuKod, konuBaslik, baslik, onClose, onNext, closeLabel }: Props) {
  const [dosya, setDosya] = useState<TestDosyasi | null>(null)
  const [hata, setHata] = useState('')
  const draftKey = 'kimya-kocun-pwa-test-draft-v1:' + grade + ':' + testId + ':' + testIndex
  const [draft] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(draftKey) ?? 'null')
      if (!raw || typeof raw.answers !== 'object' || !raw.answers || Array.isArray(raw.answers) || typeof raw.at !== 'number' || Date.now() - raw.at > 30 * 86400000) return null
      return raw as TestDraft
    } catch { return null }
  })
  const [order, setOrder] = useState<number[]>([])
  const [resumed, setResumed] = useState(false)
  const [index, setIndex] = useState(draft?.index ?? 0)
  const [cevaplar, setCevaplar] = useState<Record<number, number>>(draft?.answers ?? {})
  const [draftError, setDraftError] = useState('')
  const [sonuc, setSonuc] = useState<TestSonucu | null>(null)
  const [onay, setOnay] = useState(false)
  const hatalar = useHataDefteri()
  const [cikisSor, setCikisSor] = useState(false)

  useEffect(() => {
    if (sonuc) return
    if (!dosya || !order.length) return
    try { localStorage.setItem(draftKey, JSON.stringify({ answers: cevaplar, index, order, fingerprint: questionFingerprint(dosya.testler[testIndex]?.sorular ?? []), at: Date.now() })); setDraftError('') }
    catch { setDraftError('Cevapların bu cihazda kaydedilemedi. Testi kapatmadan tamamlamanı öneririz.') }
  }, [cevaplar, index, draftKey, sonuc, order, dosya, testIndex])

  // Cevap verilmiş ve bitirilmemiş testten çıkarken onay iste.
  const devamEdiyor = !sonuc && Object.keys(cevaplar).length > 0
  function cikmayiDene() {
    if (devamEdiyor) setCikisSor(true)
    else onClose()
  }
  // Telefonun geri tuşu da aynı onayı sorar; onay penceresi açıkken geri tuşu onu kapatır.
  useBackStep(true, () => {
    if (cikisSor) setCikisSor(false)
    else cikmayiDene()
  })

  useEffect(() => {
    let active = true
    testDosyasi(grade, testId)
      .then(data => {
        if (!active) return
        const attempt = prepareTestAttempt(data.testler[testIndex]?.sorular ?? [], draft)
        setOrder(attempt.order)
        setCevaplar(attempt.answers)
        setIndex(attempt.index)
        setResumed(attempt.resumed)
        setDosya(data)
      })
      .catch(() => active && setHata('Test yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.'))
    return () => {
      active = false
    }
  }, [grade, testId, testIndex, draft])

  if (hata) {
    return (
      <section className="card">
        <p className="muted">{hata}</p>
        <button type="button" className="btn-secondary" onClick={onClose}>Geri dön</button>
      </section>
    )
  }

  if (!dosya) return <section className="card"><p className="muted">Test yükleniyor…</p></section>

  const test = dosya.testler[testIndex]
  const kaynakSorular: Soru[] = test?.sorular ?? []
  const sorular = order.map(i => kaynakSorular[i])
  const cevaplanan = Object.keys(cevaplar).length
  const soru = sorular[index]

  function bitir() {
    if (!test) return
    const yanlisSorular: number[] = []
    let dogru = 0
    let bos = 0
    const varsayilan = testKazanimi(grade, testId)
    const kazanimlar: Record<string, [number, number]> = {}
    const kaynakCevaplar = canonicalAnswers(order, cevaplar)
    kaynakSorular.forEach((item, i) => {
      if (kaynakCevaplar[i] === undefined) bos++
      else if (kaynakCevaplar[i] === item.d) dogru++
      else yanlisSorular.push(i)
      const k = item.k ?? varsayilan
      if (k) {
        const c = kazanimlar[k] ?? [0, 0]
        c[1]++
        if (kaynakCevaplar[i] === item.d) c[0]++
        kazanimlar[k] = c
      }
    })
    setSonuc(
      sonucKaydet(
        {
          grade,
          konuKod,
          testId,
          seviye: test.seviye,
          tur: dosya!.tur,
          dogru,
          yanlis: yanlisSorular.length,
          bos,
          toplam: sorular.length,
          yanlisSorular,
          kazanimlar: Object.keys(kazanimlar).length ? kazanimlar : undefined,
        },
        konuBaslik
      )
    )
    testSonucunuIsle({
      grade,
      testId,
      testIndex,
      konuKod,
      testBaslik: baslik,
      dogruCevaplar: kaynakSorular.map(item => item.d),
      sorular: kaynakSorular,
      cevaplar: kaynakCevaplar,
    })
    localStorage.removeItem(draftKey)
    setIndex(0)
    window.scrollTo({ top: 0 })
  }

  if (sonuc) {
    const oran = basari(sonuc)
    return (
      <div className="stack">
        <section className={`card result-card${oran >= GECME_ORANI ? ' is-success' : ''}`}>
          <small>{baslik}</small>
          <div className="result-hero"><div className="result-orbit" style={{ background: `conic-gradient(${oran >= GECME_ORANI ? 'var(--teal-400)' : 'var(--purple-600)'} ${oran}%, var(--line) 0)` }}><div><strong>%{oran}</strong><span>başarı</span></div></div><div><span className="eyebrow">TEST TAMAMLANDI</span><h2>{oran >= GECME_ORANI ? 'Bir adım daha ileri!' : 'Her deneme bir adım.'}</h2></div></div>
          <div className="result-stats">
            <span className="ok">{sonuc.dogru} doğru</span>
            <span className="bad">{sonuc.yanlis} yanlış</span>
            <span>{sonuc.bos} boş</span>
          </div>
          <p className="muted">
            {oran >= GECME_ORANI
              ? konuKod
                ? 'Tebrikler, bu konuyu öğrendin. Kalıcı olması için birkaç gün sonra tekrar etmeyi unutma.'
                : 'Tebrikler, çok iyi bir sonuç.'
              : `Geçme sınırı %${GECME_ORANI}. Aşağıdan yanlışlarının çözümlerine bak, sonra tekrar dene.`}
          </p>
          <div className="row-actions start">
            <button type="button" className="btn-secondary" onClick={onClose}>{closeLabel ?? 'Konuya dön'}</button>
            {onNext && (
              <button type="button" className="primary-button" onClick={onNext}>
                Devam et · yeni test
              </button>
            )}
            <button
              type="button"
              className={onNext ? 'btn-secondary' : 'primary-button'}
              onClick={() => {
                setOrder(shuffleOrder(kaynakSorular.length, Math.random, order))
                setResumed(false)
                setSonuc(null)
                setCevaplar({})
                setIndex(0)
                setOnay(false)
              }}
            >
              Tekrar çöz
            </button>
          </div>
        </section>

        {sorular.map((item, i) => {
          const verilen = cevaplar[i]
          const durum = verilen === undefined ? 'bos' : verilen === item.d ? 'dogru' : 'yanlis'
          return (
            <section key={i} className={`card review review-${durum}`}>
              <div className="review-head">
                <b>{i + 1}. soru</b>
                <span>{durum === 'dogru' ? 'Doğru' : durum === 'yanlis' ? 'Yanlış' : 'Boş'}</span>
              </div>
              <QuestionContent html={soruGorunumHtml(item)} />
              <ol className={`siklar readonly${tamGorselSoru(item) ? ' gorsel-siklar' : ''}`}>
                {item.sik.map((sik, j) => (
                  <li
                    key={j}
                    className={[
                      j === item.d ? 'is-correct' : '',
                      j === verilen && j !== item.d ? 'is-wrong' : '',
                    ].join(' ')}
                  >
                    <span className="harf">{harf[j]}</span>
                    {!tamGorselSoru(item) && <Html html={sik} />}
                  </li>
                ))}
              </ol>
              {durum !== 'dogru' && (() => {
                const key = hataKaydiKey(grade, testId, testIndex, order[i], item.id)
                const kayit = hatalar.find(h => h.key === key)
                return (
                  <div className="neden">
                    <small>Hata defterine eklendi. Neden {durum === 'bos' ? 'boş bıraktın' : 'yanlış yaptın'}?</small>
                    <div className="cipler">
                      {(Object.keys(NEDEN_AD) as HataNedeni[]).map(neden => (
                        <button
                          key={neden}
                          type="button"
                          className={kayit?.neden === neden ? 'chip is-active' : 'chip'}
                          onClick={() => nedenKaydet(key, neden)}
                          aria-pressed={kayit?.neden === neden}
                        >
                          {NEDEN_AD[neden]}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}
              {item.c && (
                <details className="cozum" open={durum !== 'dogru'}>
                  <summary>Çözüm</summary>
                  <Html html={item.c} />
                </details>
              )}
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <div className="stack">
      {cikisSor && (
        <div className="modal-backdrop" role="presentation" onClick={() => setCikisSor(false)}>
          <div className="modal konu-onay" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="modal-body">
              <h3>Testten çıkmak istiyor musun?</h3>
              <p>{Object.keys(cevaplar).length} soruyu cevapladın. Cevapların bu cihazda taslak olarak saklanır. Aynı testi yeniden açarak devam edebilirsin.</p>
            </div>
            <div className="modal-foot">
              <div className="row-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>Çık</button>
                <button type="button" className="primary-button" onClick={() => setCikisSor(false)}>Teste devam et</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {draftError ? <p className="form-error" role="alert">{draftError}</p> : <p className="draft-status"><Icon name="check" size={16}/>{resumed ? 'Yarım kalan testine devam ediyorsun.' : 'Cevapların bu cihazda otomatik saklanır.'}</p>}
      <section className="card test-card">
        <div className="test-head">
          <button type="button" className="btn-ghost" onClick={cikmayiDene} aria-label="Testten çık">×</button>
          <div>
            <small>{baslik}</small>
            <b>{index + 1} / {sorular.length}</b>
          </div>
          <span className="muted small">{cevaplanan} cevaplandı</span>
        </div>
        <div className="test-progress" role="progressbar" aria-label="Cevaplanan sorular" aria-valuemin={0} aria-valuemax={sorular.length} aria-valuenow={cevaplanan}><span style={{ width: `${sorular.length ? cevaplanan / sorular.length * 100 : 0}%` }} /></div>
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

        {soru && (
          <div className="question-stage" key={soru.id ?? order[index]}>
            <div className="question-stage-heading"><span>SORU {String(index + 1).padStart(2, '0')}</span>{/<img\b/i.test(soru.s) && <small>Görsele dokunarak büyütebilirsin</small>}</div>
            <QuestionContent html={soruGorunumHtml(soru)} />
            <ol className={`siklar${tamGorselSoru(soru) ? ' gorsel-siklar' : ''}`}>
              {soru.sik.map((sik, j) => (
                <li key={j}>
                  <button
                    type="button"
                    className={cevaplar[index] === j ? 'is-selected' : ''}
                    onClick={() =>
                      setCevaplar(previous => {
                        const next = { ...previous }
                        if (next[index] === j) delete next[index]
                        else next[index] = j
                        return next
                      })
                    }
                    aria-pressed={cevaplar[index] === j}
                  >
                    <span className="harf">{harf[j]}</span>
                    {!tamGorselSoru(soru) && <Html html={sik} />}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="test-nav">
          <button type="button" className="btn-secondary" disabled={index === 0} onClick={() => setIndex(i => i - 1)}>
            ‹ Önceki
          </button>
          {index < sorular.length - 1 ? (
            <button type="button" className="primary-button" onClick={() => setIndex(i => i + 1)}>
              Sonraki ›
            </button>
          ) : onay || cevaplanan === sorular.length ? (
            <button type="button" className="primary-button" onClick={bitir}>
              <Icon name="check" size={16} /> Testi bitir
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={() => setOnay(true)}>
              Testi bitir
            </button>
          )}
        </div>
        {onay && cevaplanan < sorular.length && (
          <p className="program-message">
            {sorular.length - cevaplanan} soru boş. Yine de bitirmek için tekrar "Testi bitir"e bas.
          </p>
        )}
      </section>
    </div>
  )
}
