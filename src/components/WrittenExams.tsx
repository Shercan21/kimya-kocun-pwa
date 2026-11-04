import { useEffect, useState } from 'react'
import Icon from './Icon'
import {
  icerikHtml,
  icerikYolu,
  yaziliPdfAdi,
  yazililar,
  type YaziliDosyasi,
} from '../data/content'

type Props = { grades: number[] }

const KEY = 'kimya-kocun-pwa-yazili-secim'

function Html({ html, className }: { html: string; className?: string }) {
  // Bağlamdaki satır sonlarını koru, tabloları kaydırılabilir yap.
  const withBreaks = icerikHtml(html)
    .replace(/\n/g, '<br>')
    .replace(/<table/g, '<div class="table-wrap"><table')
    .replace(/<\/table>(<br>)?/g, '</table></div>')
  return <div className={className} dangerouslySetInnerHTML={{ __html: withBreaks }} />
}

function loadSelection(): Record<number, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<number, string>
  } catch {
    return {}
  }
}

export default function WrittenExams({ grades }: Props) {
  const [grade, setGrade] = useState(grades[0])
  const [data, setData] = useState<Record<number, YaziliDosyasi | null>>({})
  const [selection, setSelection] = useState<Record<number, string>>(loadSelection)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let active = true
    if (grade !== undefined && !(grade in data)) {
      yazililar(grade)
        .then(file => active && setData(previous => ({ ...previous, [grade]: file })))
        .catch(() => active && setData(previous => ({ ...previous, [grade]: null })))
    }
    return () => {
      active = false
    }
  }, [grade, data])

  if (grade === undefined) return null

  const file = data[grade]
  const sinavlar = file?.sinavlar ?? []
  const secili = sinavlar.find(item => item.id === selection[grade]) ?? sinavlar[0]

  function select(id: string) {
    const next = { ...selection, [grade]: id }
    setSelection(next)
    setOpen({})
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // seçim yalnızca bu oturumda kalır
    }
  }

  const allOpen = secili ? secili.sorular.every((_, i) => open[i]) : false

  return (
    <section className="card yazili">
      <h3 className="card-title"><Icon name="file" /> Yazılıya hazırlık</h3>
      <p className="muted small">
        Ortak yazılı sınav senaryolarına göre hazırlandı. Dönemi, yazılıyı ve
        senaryoyu seç; soruları çöz, sonra cevaplara bak.
      </p>

      {grades.length > 1 && (
        <div className="ysatir">
          <span>Sınıf</span>
          <div className="cipler">
            {grades.map(item => (
              <button
                key={item}
                type="button"
                className={item === grade ? 'chip is-active' : 'chip'}
                onClick={() => { setGrade(item); setOpen({}) }}
              >
                {item}. sınıf
              </button>
            ))}
          </div>
        </div>
      )}

      {file === undefined && <p className="muted">Yükleniyor…</p>}
      {file === null && <p className="muted">Bu sınıfın yazılı sınavları henüz eklenmedi.</p>}
      {file && !secili && (
        <p className="muted">Yazılı sınavları sınav zamanı yaklaşınca burada açılacak.</p>
      )}

      {file && secili && (
        <>
          <div className="ysecim">
            <div className="ysatir">
              <span>Dönem</span>
              <div className="cipler">
                {[1, 2].map(donem => {
                  const ilk = sinavlar.find(item => item.donem === donem)
                  return ilk ? (
                    <button
                      key={donem}
                      type="button"
                      className={donem === secili.donem ? 'chip is-active' : 'chip'}
                      onClick={() => select(ilk.id)}
                    >
                      {donem}. Dönem
                    </button>
                  ) : (
                    <span key={donem} className="chip pasif" title="Sınav zamanı açılacak">{donem}. Dönem</span>
                  )
                })}
              </div>
            </div>
            <div className="ysatir">
              <span>Yazılı</span>
              <div className="cipler">
                {[...new Set(file.tumu.filter(item => item.donem === secili.donem).map(item => item.yazili))].map(no => {
                  const ilk = sinavlar.find(item => item.donem === secili.donem && item.yazili === no)
                  return ilk ? (
                    <button
                      key={no}
                      type="button"
                      className={no === secili.yazili ? 'chip is-active' : 'chip'}
                      onClick={() => select(ilk.id)}
                    >
                      {no}. Yazılı
                    </button>
                  ) : (
                    <span key={no} className="chip pasif" title="Sınav zamanı açılacak">{no}. Yazılı · yakında</span>
                  )
                })}
              </div>
            </div>
            <div className="ysatir">
              <span>Senaryo</span>
              <div className="cipler">
                {sinavlar
                  .filter(item => item.donem === secili.donem && item.yazili === secili.yazili)
                  .map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={item.id === secili.id ? 'chip is-active' : 'chip'}
                      onClick={() => select(item.id)}
                    >
                      {item.senaryo}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <article className="ykagit">
            <header className="ykbas">
              <b>{grade}. Sınıf Kimya · {secili.donem}. Dönem {secili.yazili}. Ortak Yazılı</b>
              <span>
                {secili.tarih && `${secili.tarih} · `} Senaryo {secili.senaryo} · {secili.sorular.length} soru · 100 puan · {secili.sure} dakika
              </span>
            </header>

            <div className="yindir">
              {secili.pdfAvailable !== false && <>
              <a
                className="primary-button"
                href={icerikYolu(`pdf/${grade}/${yaziliPdfAdi(grade, secili)}.pdf`)}
                download={`${yaziliPdfAdi(grade, secili)}.pdf`}
              >
                Sınav kâğıdını indir (PDF)
              </a>
              <a
                className="btn-secondary"
                href={icerikYolu(`pdf/${grade}/${yaziliPdfAdi(grade, secili)}-cevap-anahtari.pdf`)}
                download={`${yaziliPdfAdi(grade, secili)}-cevap-anahtari.pdf`}
              >
                Cevap anahtarını indir (PDF)
              </a></>}
              {secili.pdfAvailable === false && <button className="btn-secondary" onClick={() => window.print()}>Yazdır / PDF olarak kaydet</button>}
            </div>

            {secili.sorular.map((soru, i) => (
              <section key={`${secili.id}-${i}`} className="ysoru">
                <div className="ysbas">
                  <span className="no">{i + 1}</span>
                  <b>Soru {i + 1}</b>
                  <span className="yk" title={file.kazanimlar[soru.kazanim] ?? ''}>{soru.kazanim}</span>
                  <span className="yp">{soru.puan} puan</span>
                </div>
                <Html className="ybaglam" html={soru.baglam} />
                {soru.maddeler.map(madde => (
                  <div key={madde.h} className="ymadde">
                    <b>{madde.h})</b>
                    <Html html={madde.s} />
                    <span className="yp">{madde.p} p</span>
                    {open[i] && (
                      <div className="ycevap">
                        <b>Cevap:</b> <Html html={madde.c} />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary"
                  aria-expanded={!!open[i]}
                  onClick={() => setOpen(previous => ({ ...previous, [i]: !previous[i] }))}
                >
                  {open[i] ? 'Cevabı gizle' : 'Cevabı göster'}
                </button>
              </section>
            ))}

            <button
              type="button"
              className="primary-button yhepsi"
              onClick={() =>
                setOpen(allOpen ? {} : Object.fromEntries(secili.sorular.map((_, i) => [i, true])))
              }
            >
              {allOpen ? 'Bütün cevapları gizle' : 'Bütün cevapları göster'}
            </button>
          </article>
        </>
      )}
    </section>
  )
}
