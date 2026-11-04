import { useContext, useEffect, useRef, useState } from 'react'
import { EtkinlikKayit, etkinlikSonucuKaydet } from '../data/activityResults'
import { icerikHtml, icerikYolu, type Etkinlik } from '../data/content'

const TUR_AD: Record<Etkinlik['tur'], string> = {
  dy: 'Doğru – yanlış',
  es: 'Eşleştirme',
  bo: 'Boşluk doldurma',
  au: 'Açık uçlu',
  ta: 'Tablo tamamlama',
  kh: 'Kavram haritası',
}

// Etkinlik metinlerinde <sub>, <sup> gibi biçimlendirmeler olabilir.
function H({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: icerikHtml(html) }} />
}

function plain(html: string) {
  return html.replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '')
}

function normalize(text: string) {
  // "1s2 2s2" ile "1s<sup>2</sup> 2s<sup>2</sup>" aynı kabul edilir.
  return text.toLocaleLowerCase('tr-TR').replace(/[\s^]+/g, '').replace(/[.,;:]$/, '')
}

// "Eczacılık / ilaç kimyası" gibi seçenekli cevapları da kabul eder.
function matches(given: string, expected: string) {
  const value = normalize(plain(given))
  const target = plain(expected)
  if (!value) return false
  return target.split('/').some(option => normalize(option) === value) || normalize(target) === value
}

type Mark = 'ok' | 'bad' | null

function markClass(mark: Mark) {
  return mark === 'ok' ? 'is-ok' : mark === 'bad' ? 'is-bad' : ''
}

function Footer({
  checked,
  score,
  total,
  onCheck,
  onReveal,
  onReset,
  revealed,
}: {
  checked: boolean
  score?: number
  total?: number
  onCheck?: () => void
  onReveal: () => void
  onReset: () => void
  revealed: boolean
}) {
  // Kontrol edilince puan kaydedilir (gelişim raporu için).
  const kaydet = useContext(EtkinlikKayit)
  const son = useRef<string>('')
  useEffect(() => {
    if (!checked || total === undefined || score === undefined || !kaydet) return
    const key = `${score}/${total}`
    if (son.current === key) return
    son.current = key
    kaydet(score, total)
  }, [checked, score, total, kaydet])
  return (
    <div className="act-footer">
      {checked && total !== undefined && (
        <span className={score === total ? 'act-score ok' : 'act-score'}>
          {score} / {total} doğru
        </span>
      )}
      <span className="act-buttons">
        {(checked || revealed) && (
          <button type="button" className="btn-ghost" onClick={onReset}>Sıfırla</button>
        )}
        {!revealed && (
          <button type="button" className="btn-secondary" onClick={onReveal}>Cevapları göster</button>
        )}
        {onCheck && (
          <button type="button" className="primary-button" onClick={onCheck}>Kontrol et</button>
        )}
      </span>
    </div>
  )
}

type DyItem = { h: string; t: string }
type DyAnswer = Record<string, { d: boolean; a?: string }>

function DogruYanlis({ data }: { data: Etkinlik }) {
  const items = data.maddeler as DyItem[]
  const cevap = data.cevap as DyAnswer
  const [values, setValues] = useState<Record<string, boolean>>({})
  const [checked, setChecked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const show = checked || revealed
  const score = items.filter(item => values[item.h] === cevap[item.h]?.d).length

  return (
    <>
      <ul className="act-list">
        {items.map(item => {
          const mark: Mark = checked ? (values[item.h] === cevap[item.h]?.d ? 'ok' : 'bad') : null
          return (
            <li key={item.h} className={markClass(mark)}>
              <span className="act-text"><b>{item.h})</b> <H html={item.t} /></span>
              <span className="dy-buttons">
                {[true, false].map(value => (
                  <button
                    key={String(value)}
                    type="button"
                    className={values[item.h] === value ? 'chip is-active' : 'chip'}
                    onClick={() => {
                      setChecked(false)
                      setValues(previous => ({ ...previous, [item.h]: value }))
                    }}
                    aria-pressed={values[item.h] === value}
                  >
                    {value ? 'D' : 'Y'}
                  </button>
                ))}
              </span>
              {show && (
                <small className="act-answer">
                  {cevap[item.h]?.d ? 'Doğru' : 'Yanlış'}
                  {cevap[item.h]?.a ? <> — <H html={cevap[item.h].a ?? ''} /></> : null}
                </small>
              )}
            </li>
          )
        })}
      </ul>
      <Footer
        checked={checked}
        revealed={revealed}
        score={score}
        total={items.length}
        onCheck={() => setChecked(true)}
        onReveal={() => setRevealed(true)}
        onReset={() => { setValues({}); setChecked(false); setRevealed(false) }}
      />
    </>
  )
}

function Eslestirme({ data }: { data: Etkinlik }) {
  const sol = data.sol as { n: number; t: string }[]
  const sag = data.sag as { h: string; t: string }[]
  const cevap = data.cevap as Record<string, string>
  const [values, setValues] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const score = sol.filter(item => values[item.n] === cevap[item.n]).length

  return (
    <>
      <ul className="act-list">
        {sol.map(item => {
          const mark: Mark = checked ? (values[item.n] === cevap[item.n] ? 'ok' : 'bad') : null
          return (
            <li key={item.n} className={markClass(mark)}>
              <span className="act-text"><b>{item.n}.</b> <H html={item.t} /></span>
              <select
                value={values[item.n] ?? ''}
                onChange={event => {
                  setChecked(false)
                  setValues(previous => ({ ...previous, [item.n]: event.target.value }))
                }}
                aria-label={`${item.n}. ifadenin karşılığı`}
              >
                <option value="">Seç</option>
                {sag.map(option => (
                  <option key={option.h} value={option.h}>{option.h}) {plain(option.t)}</option>
                ))}
              </select>
              {(checked || revealed) && (
                <small className="act-answer">
                  Doğru cevap: {cevap[item.n]}) <H html={sag.find(option => option.h === cevap[item.n])?.t ?? ''} />
                </small>
              )}
            </li>
          )
        })}
      </ul>
      <Footer
        checked={checked}
        revealed={revealed}
        score={score}
        total={sol.length}
        onCheck={() => setChecked(true)}
        onReveal={() => setRevealed(true)}
        onReset={() => { setValues({}); setChecked(false); setRevealed(false) }}
      />
    </>
  )
}

function BoslukDoldurma({ data }: { data: Etkinlik }) {
  const kelimeler = data.kelimeler as string[]
  const cumleler = data.cumleler as string[]
  const cevap = data.cevap as Record<string, string>
  const [values, setValues] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const keys = Object.keys(cevap)
  const score = keys.filter(key => matches(values[key] ?? '', cevap[key])).length

  return (
    <>
      <div className="word-bank">
        {kelimeler.map(word => <span key={word} className="badge-word"><H html={word} /></span>)}
      </div>
      <ol className="act-sentences">
        {cumleler.map((sentence, index) => {
          const parts = sentence.replace(/^\d+\.\s*/, '').split(/\((\d+)\)\s*_+/)
          return (
            <li key={index}>
              {parts.map((part, i) => {
                if (i % 2 === 0) return <H key={i} html={part} />
                const key = part
                const mark: Mark = checked ? (matches(values[key] ?? '', cevap[key] ?? '') ? 'ok' : 'bad') : null
                return (
                  <select
                    key={i}
                    className={`blank ${markClass(mark)}`}
                    value={values[key] ?? ''}
                    onChange={event => {
                      setChecked(false)
                      setValues(previous => ({ ...previous, [key]: event.target.value }))
                    }}
                    aria-label={`${key}. boşluk`}
                  >
                    <option value="">({key}) …</option>
                    {kelimeler.map(word => <option key={word} value={word}>{plain(word)}</option>)}
                  </select>
                )
              })}
              {(checked || revealed) && (
                <small className="act-answer">
                  <H html={[...sentence.matchAll(/\((\d+)\)/g)].map(m => `(${m[1]}) ${cevap[m[1]]}`).join(' · ')} />
                </small>
              )}
            </li>
          )
        })}
      </ol>
      <Footer
        checked={checked}
        revealed={revealed}
        score={score}
        total={keys.length}
        onCheck={() => setChecked(true)}
        onReveal={() => setRevealed(true)}
        onReset={() => { setValues({}); setChecked(false); setRevealed(false) }}
      />
    </>
  )
}

function AcikUclu({ data }: { data: Etkinlik }) {
  const sorular = data.sorular as string[]
  const cevap = data.cevap as Record<string, string>
  const [values, setValues] = useState<Record<number, string>>({})
  const [revealed, setRevealed] = useState(false)

  return (
    <>
      <ol className="act-sentences">
        {sorular.map((soru, index) => (
          <li key={index}>
            <H html={soru} />
            <textarea
              rows={3}
              value={values[index] ?? ''}
              onChange={event => setValues(previous => ({ ...previous, [index]: event.target.value }))}
              placeholder="Cevabını buraya yaz"
              aria-label={`${index + 1}. soru için cevabın`}
            />
            {revealed && <small className="act-answer">Örnek cevap: <H html={cevap[String(index + 1)] ?? ''} /></small>}
          </li>
        ))}
      </ol>
      <p className="muted small">Cevabını yazdıktan sonra örnek cevapla karşılaştır.</p>
      <Footer
        checked={false}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onReset={() => { setValues({}); setRevealed(false) }}
      />
    </>
  )
}

function Bosluklar({
  keys,
  cevap,
  values,
  setValue,
  checked,
}: {
  keys: string[]
  cevap: Record<string, string>
  values: Record<string, string>
  setValue: (key: string, value: string) => void
  checked: boolean
}) {
  return (
    <div className="kh-inputs">
      {keys.map(key => {
        const mark: Mark = checked ? (matches(values[key] ?? '', cevap[key]) ? 'ok' : 'bad') : null
        return (
          <label key={key} className={markClass(mark)}>
            <b>({key})</b>
            <input value={values[key] ?? ''} onChange={event => setValue(key, event.target.value)} />
          </label>
        )
      })}
    </div>
  )
}

function KavramHaritasi({ data }: { data: Etkinlik }) {
  const cevap = data.cevap as Record<string, string>
  const keys = (data.bos as number[]).map(String)
  const [values, setValues] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const score = keys.filter(key => matches(values[key] ?? '', cevap[key])).length

  return (
    <>
      <img className="kh-image" src={icerikYolu(data.gorsel as string)} alt="Kavram haritası" loading="lazy" />
      <Bosluklar
        keys={keys}
        cevap={cevap}
        values={values}
        checked={checked}
        setValue={(key, value) => { setChecked(false); setValues(previous => ({ ...previous, [key]: value })) }}
      />
      {(checked || revealed) && (
        <p className="act-answer">{keys.map(key => `(${key}) ${cevap[key]}`).join(' · ')}</p>
      )}
      <Footer
        checked={checked}
        revealed={revealed}
        score={score}
        total={keys.length}
        onCheck={() => setChecked(true)}
        onReveal={() => setRevealed(true)}
        onReset={() => { setValues({}); setChecked(false); setRevealed(false) }}
      />
    </>
  )
}

function Tablo({ data }: { data: Etkinlik }) {
  const tablo = data.tablo as string[][]
  const cevap = data.cevap as Record<string, string>
  const [values, setValues] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const keys = Object.keys(cevap)
  const score = keys.filter(key => matches(values[key] ?? '', cevap[key])).length

  return (
    <>
      <div className="table-wrap">
        <table className="act-table">
          <tbody>
            {tablo.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => {
                  const m = cell.match(/^\((\d+)\)$/)
                  if (r === 0) return <th key={c}><H html={cell} /></th>
                  if (!m) return <td key={c}><H html={cell} /></td>
                  const key = m[1]
                  const mark: Mark = checked ? (matches(values[key] ?? '', cevap[key] ?? '') ? 'ok' : 'bad') : null
                  return (
                    <td key={c} className={markClass(mark)}>
                      <input
                        value={values[key] ?? ''}
                        placeholder={`(${key})`}
                        onChange={event => {
                          setChecked(false)
                          setValues(previous => ({ ...previous, [key]: event.target.value }))
                        }}
                        aria-label={`${key}. boş hücre`}
                      />
                      {(checked || revealed) && <small className="act-answer"><H html={cevap[key]} /></small>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer
        checked={checked}
        revealed={revealed}
        score={keys.length ? score : undefined}
        total={keys.length || undefined}
        onCheck={keys.length ? () => setChecked(true) : undefined}
        onReveal={() => setRevealed(true)}
        onReset={() => { setValues({}); setChecked(false); setRevealed(false) }}
      />
    </>
  )
}

export default function ActivityRunner({ etkinlik, grade, kod }: { etkinlik: Etkinlik; grade?: number; kod?: string }) {
  const kaydet =
    grade !== undefined && kod
      ? (dogru: number, toplam: number) => etkinlikSonucuKaydet({ grade, kod, no: etkinlik.no, dogru, toplam })
      : null
  return (
    <EtkinlikKayit.Provider value={kaydet}>
    <section className="card activity">
      <div className="act-head">
        <span className="badge">{etkinlik.no}. etkinlik · {TUR_AD[etkinlik.tur]}</span>
      </div>
      <p className="act-instruction"><H html={etkinlik.yonerge} /></p>
      {etkinlik.tur === 'dy' && <DogruYanlis data={etkinlik} />}
      {etkinlik.tur === 'es' && <Eslestirme data={etkinlik} />}
      {etkinlik.tur === 'bo' && <BoslukDoldurma data={etkinlik} />}
      {etkinlik.tur === 'au' && <AcikUclu data={etkinlik} />}
      {etkinlik.tur === 'kh' && <KavramHaritasi data={etkinlik} />}
      {etkinlik.tur === 'ta' && <Tablo data={etkinlik} />}
    </section>
    </EtkinlikKayit.Provider>
  )
}

