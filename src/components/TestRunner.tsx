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

export default function TestRunner({ grade, testId, testIndex, konuKod, konuBaslik, baslik, onClose, onNext, closeLabel }: Props) {
  const [dosya, setDosya] = useState<TestDosyasi | null>(null)
  const [hata, setHata] = useState('')
  const draftKey = 'kimya-kocun-pwa-test-draft-v1:' + grade + ':' + testId + ':' + testIndex
  const [draft] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(draftKey) ?? 'null')
      if (!raw || typeof raw.answers !== 'object' || !raw.answers || Date.now() - raw.at > 30 * 86400000) return null
      return raw as { answers: Record<number, number>; index: number; at: number }
    } catch { return null }
  })
  const [index, setIndex] = useState(draft?.index ?? 0)
  const [cevaplar, setCevaplar] = useState<Record<number, number>>(draft?.answers ?? {})
  const [draftError, setDraftError] = useState('')
  const [sonuc, setSonuc] = useState<TestSonucu | null>(null)
  const [onay, setOnay] = useState(false)
  const hatalar = useHataDefteri()
  const [cikisSor, setCikisSor] = useState(false)

  useEffect(() => {
    if (sonuc) return
    if (!Object.keys(cevaplar).length) return
    try { localStorage.setItem(draftKey, JSON.stringify({ answers: cevaplar, index, at: Date.now() })); setDraftError('') }
    catch { setDraftError('Cevapların bu cihazda kaydedilemedi. Testi kapatmadan tamamlamanı öneririz.') }
  }, [cevaplar, index, draftKey, sonuc])

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
      .then(data => active && setDosya(data))
      .catch(() => active && setHata('Test yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.'))
    return () => {
      active = false
    }
  }, [grade, testId])

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
  const sorular: Soru[] = test?.sorular ?? []
  const cevaplanan = Object.keys(cevaplar).length
  const soru = sorular[index]

  function bitir() {
    if (!test) return
    const yanlisSorular: number[] = []
    let dogru = 0
    let bos = 0
    const varsayilan = testKazanimi(grade, testId)
    const kazanimlar: Record<string, [number, number]> = {}
    sorular.forEach((item, i) => {
      if (cevaplar[i] === undefined) bos++
      else if (cevaplar[i] === item.d) dogru++
      else yanlisSorular.push(i)
      const k = item.k ?? varsayilan
      if (k) {
        const c = kazanimlar[k] ?? [0, 0]
        c[1]++
        if (cevaplar[i] === item.d) c[0]++
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
      dogruCevaplar: sorular.map(item => item.d),
      sorular,
      cevaplar,
    })
    localStorage.removeItem(draftKey)
    setIndex(0)
    window.scrollTo({ top: 0 })
  }

  if (sonuc) {
    const oran = basari(sonuc)
    return (
      <div className="stack">
        <section className="card result-card">
          <small>{baslik}</small>
          <h2>%{oran} başarı</h2>
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
              <Html className="soru-metni" html={soruGorunumHtml(item)} />
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
                const key = hataKaydiKey(grade, testId, testIndex, i, item.id)
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
      {draftError ? <p className="form-error" role="alert">{draftError}</p> : <p className="draft-status"><Icon name="check" size={16}/>{draft ? 'Yarım kalan testine devam ediyorsun.' : 'Cevapların bu cihazda otomatik saklanır.'}</p>}
      <section className="card test-card">
        <div className="test-head">
          <button type="button" className="btn-ghost" onClick={cikmayiDene} aria-label="Testten çık">×</button>
          <div>
            <small>{baslik}</small>
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

        {soru && (
          <>
            <Html className="soru-metni" html={soruGorunumHtml(soru)} />
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
          </>
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
