import { useState } from 'react'
import { useBackStep } from '../data/backNav'
import Icon from './Icon'
import TestRunner from './TestRunner'
import { sinifMufredati } from '../data/content'
import { testSonuclari } from '../data/results'
import { SINAV_SINIFLARI } from '../data/profile'

// "Soru çözmek istiyorum" akışı:
// (12. sınıf: TYT / AYT → sınıf) → Tema bazlı (sarmal) ya da Genel (karma).
type Props = { grade: number }
type Tur = 'tema' | 'genel'
type Active = { grade: number; id: string; baslik: string }

function Secim<T extends string | number>({
  baslik,
  secenekler,
  deger,
  onSec,
}: {
  baslik: string
  secenekler: { id: T; ad: string; alt?: string }[]
  deger: T | null
  onSec: (id: T) => void
}) {
  return (
    <section className="card">
      <h3 className="card-title">{baslik}</h3>
      <div className="grade-picker" role="group" aria-label={baslik}>
        {secenekler.map(s => (
          <button
            key={String(s.id)}
            type="button"
            className={deger === s.id ? 'chip is-active' : 'chip'}
            aria-pressed={deger === s.id}
            onClick={() => onSec(s.id)}
          >
            {s.ad}
            {s.alt && <small>{s.alt}</small>}
          </button>
        ))}
      </div>
    </section>
  )
}

export default function PracticePage({ grade: profileGrade }: Props) {
  const senior = profileGrade === 12
  const [sinav, setSinav] = useState<'TYT' | 'AYT' | null>(null)
  const [sinif, setSinif] = useState<number | null>(senior ? null : profileGrade)
  const [tur, setTur] = useState<Tur | null>(null)
  const [temaNo, setTemaNo] = useState<number | null>(null)
  const [active, setActive] = useState<Active | null>(null)
  const [, refresh] = useState(0)
  useBackStep(!!active, () => {
    setActive(null)
    setTur(null)
    setTemaNo(null)
    refresh(v => v + 1)
  })

  const data = sinif ? sinifMufredati(sinif) : null

  // Seçime uyan testler: tema → o temanın sarmal testleri, genel → karma testler.
  function havuz(t: Tur, g: number, tema: number | null): Active[] {
    const d = sinifMufredati(g)
    if (!d) return []
    if (t === 'genel') return d.karma.map((test, i) => ({ grade: g, id: test.id, baslik: `${g}. sınıf · Karma test ${i + 1}` }))
    return d.temalar
      .filter(x => x.no === tema)
      .flatMap(x => x.bolumler.flatMap(b => b.sarmal.map(test => ({ grade: g, id: test.id, baslik: `${g}. sınıf · Sarmal · ${b.kod} ${b.ad}` }))))
  }

  // Rastgele test: önce hiç çözülmemişler, aynı test arka arkaya gelmez.
  function rastgele(t: Tur, g: number, tema: number | null, onceki?: string) {
    const list = havuz(t, g, tema)
    if (!list.length) return
    const cozulmemis = list.filter(x => testSonuclari(x.grade, x.id, null).length === 0 && x.id !== onceki)
    const aday = cozulmemis.length ? cozulmemis : list.filter(x => x.id !== onceki)
    const secim = (aday.length ? aday : list)[Math.floor(Math.random() * (aday.length || list.length))]
    setActive(secim)
    window.scrollTo({ top: 0 })
  }

  if (active && sinif && tur) {
    return (
      <TestRunner
        key={active.id}
        grade={active.grade}
        testId={active.id}
        testIndex={0}
        konuKod={null}
        konuBaslik={null}
        baslik={active.baslik}
        closeLabel="Bitir"
        onNext={() => rastgele(tur, sinif, temaNo, active.id)}
        onClose={() => {
          setActive(null)
          setTur(null)
          setTemaNo(null)
          refresh(v => v + 1)
        }}
      />
    )
  }

  return (
    <div className="stack">
      {senior && (
        <Secim
          baslik="Hangi sınava hazırlanıyorsun?"
          secenekler={[
            { id: 'TYT' as const, ad: 'TYT', alt: '9 ve 10. sınıf' },
            { id: 'AYT' as const, ad: 'AYT', alt: '11. sınıf' },
          ]}
          deger={sinav}
          onSec={id => {
            setSinav(id)
            const list = SINAV_SINIFLARI[id]
            setSinif(list.length === 1 ? list[0] : null)
            setTur(null)
            setTemaNo(null)
          }}
        />
      )}

      {senior && sinav === 'TYT' && (
        <Secim
          baslik="Hangi sınıfın konularından?"
          secenekler={SINAV_SINIFLARI.TYT.map(g => ({ id: g, ad: `${g}. sınıf` }))}
          deger={sinif}
          onSec={g => {
            setSinif(g)
            setTur(null)
            setTemaNo(null)
          }}
        />
      )}

      {sinif && data && (
        <Secim
          baslik="Nasıl çözmek istersin?"
          secenekler={[
            { id: 'tema' as const, ad: 'Tema bazlı', alt: 'Sarmal testler' },
            { id: 'genel' as const, ad: 'Bütün sınıf', alt: 'Karma testler' },
          ]}
          deger={tur}
          onSec={id => {
            setTur(id)
            setTemaNo(null)
            if (id === 'genel' && sinif) rastgele('genel', sinif, null)
          }}
        />
      )}

      {sinif && data && tur === 'tema' && (
        <Secim
          baslik="Tema seç"
          secenekler={data.temalar.map(t => ({ id: t.no, ad: `${t.no}. tema`, alt: t.ad }))}
          deger={temaNo}
          onSec={id => {
            setTemaNo(Number(id))
            rastgele('tema', sinif, Number(id))
          }}
        />
      )}

      {sinif && !data && (
        <section className="card coming">
          <Icon name="file" size={28} />
          <h2>{sinif}. sınıf testleri hazırlanıyor</h2>
        </section>
      )}
    </div>
  )
}
