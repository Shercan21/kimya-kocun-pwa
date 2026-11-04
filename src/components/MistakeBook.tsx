import { useEffect, useState } from 'react'
import { useBackStep } from '../data/backNav'
import Icon from './Icon'
import { icerikHtml, konuBul, testDosyasi, type Soru } from '../data/content'
import {
  kaydiSil,
  NEDEN_AD,
  tekrarSonucu,
  useHataDefteri,
  type HataKaydi,
  type HataNedeni,
} from '../data/mistakes'

type Props = {
  grades: number[]
  onClose: () => void
}

const harf = ['A', 'B', 'C', 'D', 'E', 'F']

function Html({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: icerikHtml(html) }} />
}

function konuAdi(item: HataKaydi) {
  if (!item.konuKod) return item.testBaslik
  return konuBul(item.grade, item.konuKod)?.konu.ad ?? item.testBaslik
}

function Practice({ keys, onDone }: { keys: string[]; onDone: () => void }) {
  const hatalar = useHataDefteri()
  const [index, setIndex] = useState(0)
  const [soru, setSoru] = useState<Soru | null>(null)
  const [hata, setHata] = useState('')
  const [secim, setSecim] = useState<number | null>(null)
  const [skor, setSkor] = useState({ dogru: 0, yanlis: 0 })
  const kayit = hatalar.find(item => item.key === keys[index])

  useEffect(() => {
    let active = true
    if (!kayit) return
    testDosyasi(kayit.grade, kayit.testId)
      .then(dosya => {
        if (!active) return
        const item = dosya.testler[kayit.testIndex]?.sorular[kayit.soruIndex]
        if (item) setSoru(item)
        else setHata('Soru bulunamadı.')
      })
      .catch(() => active && setHata('Soru yüklenemedi.'))
    return () => {
      active = false
    }
    // Yalnızca soru değişince yükle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys[index]])

  if (index >= keys.length) {
    return (
      <section className="card result-card">
        <small>Hata defteri tekrarı</small>
        <h2>{skor.dogru} / {keys.length} düzeldi</h2>
        <p className="muted">
          {skor.yanlis === 0
            ? 'Harika, bu turdaki bütün hataların düzeldi.'
            : `${skor.yanlis} soru hâlâ açık. Çözümlerine bakıp bir süre sonra tekrar dene.`}
        </p>
        <div className="row-actions start">
          <button type="button" className="primary-button" onClick={onDone}>Hata defterine dön</button>
        </div>
      </section>
    )
  }

  if (!kayit) return null

  function sec(j: number) {
    if (secim !== null || !soru || !kayit) return
    setSecim(j)
    const dogru = j === soru.d
    tekrarSonucu(kayit.key, dogru, j)
    setSkor(previous => ({ dogru: previous.dogru + (dogru ? 1 : 0), yanlis: previous.yanlis + (dogru ? 0 : 1) }))
  }

  function sonraki() {
    setSoru(null)
    setSecim(null)
    setHata('')
    setIndex(value => value + 1)
    window.scrollTo({ top: 0 })
  }

  return (
    <section className="card test-card">
      <div className="test-head">
        <button type="button" className="btn-ghost" onClick={onDone} aria-label="Tekrardan çık">×</button>
        <div>
          <small>{kayit.grade}. sınıf · {konuAdi(kayit)}</small>
          <b>{index + 1} / {keys.length}</b>
        </div>
        <span className="muted small">{kayit.yanlisSayisi} kez yanlış</span>
      </div>

      {hata && <p className="muted">{hata}</p>}
      {!soru && !hata && <p className="muted">Yükleniyor…</p>}

      {soru && (
        <>
          <Html className="soru-metni" html={soru.s} />
          <ol className={secim === null ? 'siklar' : 'siklar readonly'}>
            {soru.sik.map((sik, j) =>
              secim === null ? (
                <li key={j}>
                  <button type="button" onClick={() => sec(j)}>
                    <span className="harf">{harf[j]}</span>
                    <Html html={sik} />
                  </button>
                </li>
              ) : (
                <li
                  key={j}
                  className={[j === soru.d ? 'is-correct' : '', j === secim && j !== soru.d ? 'is-wrong' : ''].join(' ')}
                >
                  <span className="harf">{harf[j]}</span>
                  <Html html={sik} />
                </li>
              )
            )}
          </ol>

          {secim !== null && (
            <>
              <p className={secim === soru.d ? 'success-text' : 'error-text'}>
                {secim === soru.d ? 'Doğru! Bu hata düzeldi.' : 'Yine yanlış. Çözüme dikkatle bak.'}
              </p>
              {soru.c && (
                <details className="cozum" open>
                  <summary>Çözüm</summary>
                  <Html html={soru.c} />
                </details>
              )}
              <div className="test-nav">
                <span />
                <button type="button" className="primary-button" onClick={sonraki}>
                  {index < keys.length - 1 ? 'Sonraki ›' : 'Bitir'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

export default function MistakeBook({ grades, onClose }: Props) {
  const hatalar = useHataDefteri().filter(item => grades.includes(item.grade))
  const acik = hatalar.filter(item => item.durum === 'acik')
  const duzeltilen = hatalar.filter(item => item.durum === 'duzeltildi')
  const [practice, setPractice] = useState<string[] | null>(null)
  useBackStep(!!practice, () => setPractice(null))
  const [showFixed, setShowFixed] = useState(false)

  if (practice) {
    return <Practice keys={practice} onDone={() => setPractice(null)} />
  }

  // Konuya göre grupla
  const gruplar = new Map<string, HataKaydi[]>()
  for (const item of acik) {
    const key = `${item.grade}|${item.konuKod ?? item.testId}`
    gruplar.set(key, [...(gruplar.get(key) ?? []), item])
  }

  const nedenSayisi = (Object.keys(NEDEN_AD) as HataNedeni[])
    .map(neden => ({ neden, sayi: hatalar.filter(item => item.neden === neden).length }))
    .filter(item => item.sayi > 0)
  const tekrarlanan = acik.filter(item => item.yanlisSayisi > 1).length

  return (
    <div className="stack">
      <section className="card">
        <button type="button" className="back-link" onClick={onClose}>‹ Gelişimim</button>
        <h3 className="card-title"><Icon name="notebook" /> Hata defterim</h3>
        <div className="stats">
          <div className="stat"><small>Açık</small><b>{acik.length}</b></div>
          <div className="stat"><small>Düzeltildi</small><b>{duzeltilen.length}</b></div>
          <div className="stat"><small>Tekrarlanan</small><b>{tekrarlanan}</b></div>
        </div>
        {nedenSayisi.length > 0 && (
          <div className="neden-dagilim">
            <small className="muted">Hata nedenlerin</small>
            {nedenSayisi.map(({ neden, sayi }) => (
              <div key={neden} className="neden-bar">
                <span>{NEDEN_AD[neden]}</span>
                <span className="mini-bar"><span style={{ width: `${(sayi / hatalar.length) * 100}%` }} /></span>
                <b>{sayi}</b>
              </div>
            ))}
          </div>
        )}
        {acik.length > 0 ? (
          <button
            type="button"
            className="primary-button full"
            onClick={() => setPractice(acik.map(item => item.key))}
          >
            Bütün açık hataları tekrar çöz ({acik.length})
          </button>
        ) : (
          <p className="muted">
            {hatalar.length === 0
              ? 'Testlerde yanlış yaptığın ya da boş bıraktığın sorular burada birikir.'
              : 'Açık hatan kalmadı. Tebrikler!'}
          </p>
        )}
      </section>

      {[...gruplar.entries()].map(([key, items]) => {
        const first = items[0]
        return (
          <section key={key} className="card">
            <div className="mistake-group-head">
              <div>
                <small className="muted">{first.grade}. sınıf{first.konuKod ? ` · ${first.konuKod}` : ''}</small>
                <h3>{konuAdi(first)}</h3>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setPractice(items.map(item => item.key))}>
                Tekrar çöz ({items.length})
              </button>
            </div>
            <ul className="mistake-list">
              {items.map(item => (
                <li key={item.key}>
                  <span className={item.tur === 'bos' ? 'level' : 'level level-zor'}>
                    {item.tur === 'bos' ? 'Boş' : 'Yanlış'}
                  </span>
                  <span className="test-title">
                    {item.testBaslik} · {item.soruIndex + 1}. soru
                    <small>
                      {item.yanlisSayisi > 1 ? `${item.yanlisSayisi} kez · ` : ''}
                      {item.neden ? NEDEN_AD[item.neden] : 'Neden belirtilmedi'}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {duzeltilen.length > 0 && (
        <section className="card">
          <button type="button" className="tema-head" onClick={() => setShowFixed(value => !value)} aria-expanded={showFixed}>
            <span className="tema-title">Düzeltilen hatalar ({duzeltilen.length})</span>
            <Icon name="chevron" size={18} />
          </button>
          {showFixed && (
            <ul className="mistake-list">
              {duzeltilen.map(item => (
                <li key={item.key}>
                  <span className="level level-kolay">Düzeldi</span>
                  <span className="test-title">
                    {konuAdi(item)} · {item.soruIndex + 1}. soru
                    <small>{item.yanlisSayisi} kez yanlış yapılmıştı</small>
                  </span>
                  <button type="button" className="btn-ghost tiny" onClick={() => kaydiSil(item.key)} aria-label="Kaydı sil">×</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
