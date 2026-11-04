import { useState } from 'react'
import { useBackStep } from '../data/backNav'
import Icon from './Icon'
import TestRunner from './TestRunner'
import WrittenExams from './WrittenExams'
import { kilitliKonular } from '../data/locks'
import { sinifMufredati } from '../data/content'
import { basari, testSonuclari } from '../data/results'

// 12. sınıf / mezun TYT-AYT için 9-11 testlerini görür ama o sınıfların
// okul yazılılarını görmez (showWritten=false).
type Props = { grades: number[]; label?: string; showWritten?: boolean; onlyWritten?: boolean; sirali?: boolean; bilinen?: Set<string> }

type Active = { grade: number; id: string; baslik: string }

export default function ExamsPage({ grades, label, showWritten = true, onlyWritten = false, sirali = false, bilinen = new Set() }: Props) {
  const sets = grades
    .map(grade => ({ grade, data: sinifMufredati(grade) }))
    .filter((item): item is { grade: number; data: NonNullable<ReturnType<typeof sinifMufredati>> } => item.data !== null)
  const locked = sirali ? kilitliKonular(grades, bilinen) : new Set<string>()
  const multi = sets.length > 1
  const [active, setActive] = useState<Active | null>(null)
  const [, refresh] = useState(0)
  useBackStep(!!active, () => {
    setActive(null)
    refresh(value => value + 1)
  })

  if (active) {
    return (
      <TestRunner
        grade={active.grade}
        testId={active.id}
        testIndex={0}
        konuKod={null}
        konuBaslik={null}
        baslik={active.baslik}
        onClose={() => {
          setActive(null)
          refresh(value => value + 1)
        }}
      />
    )
  }

  const score = (grade: number, id: string) => {
    const results = testSonuclari(grade, id, null)
    const last = results[results.length - 1]
    return last ? basari(last) : null
  }

  const row = (grade: number, id: string, baslik: string, alt: string) => {
    const curriculum = sinifMufredati(grade)
    const section = curriculum?.temalar.flatMap(t => t.bolumler).find(b => b.sarmal.some(t => t.id === id))
    const blocked = sirali && (section ? section.konular.some(k => locked.has(grade + '|' + k.kod)) : locked.size > 0)
    const last = score(grade, id)
    return (
      <li key={`${grade}-${id}`}>
        <span className="test-title">
          {baslik}
          <small>{alt}{last !== null ? ` · Son sonuç: %${last}` : ''}</small>
        </span>
        <button
          type="button"
          className={last === null ? 'primary-button' : 'btn-secondary'}
          disabled={blocked}
          title={blocked ? "Önce bölümdeki konuları tamamla" : undefined}
          onClick={() => setActive({ grade, id, baslik })}
        >
          {blocked ? 'Önce konuları tamamla' : last === null ? 'Başla' : 'Tekrar çöz'}
        </button>
      </li>
    )
  }

  return (
    <div className="stack">
      {showWritten && sets.length > 0 && <WrittenExams key={sets.map(item => item.grade).join('-')} grades={sets.map(item => item.grade)} />}

      {sets.length === 0 && (
        <section className="card coming">
          <Icon name="file" size={28} />
          <h2>{grades.length ? `${grades.join(', ')}. sınıf testleri hazırlanıyor` : 'Önce sınıfını seç'}</h2>
          <p>Şu an 9, 10 ve 11. sınıfların sarmal ve karma testleri hazır.</p>
        </section>
      )}

      {sets.length > 0 && !onlyWritten && (
        <>
          {label && (
            <p className="program-message">
              {label} hazırlığı: {sets.map(item => `${item.grade}. sınıf`).join(' ve ')} testleri
            </p>
          )}
          <section className="card">
            <h3 className="card-title"><Icon name="repeat" /> Sarmal testler</h3>
            <p className="muted small">Bir bölümün bütün konularını birlikte tekrar eder.</p>
            <ul className="test-list">
              {sets.flatMap(({ grade, data }) =>
                data.temalar.flatMap(tema =>
                  tema.bolumler.flatMap(bolum =>
                    bolum.sarmal.map(test =>
                      row(grade, test.id, `${multi ? `${grade}. sınıf · ` : ''}${bolum.kod} ${bolum.ad}`, `${tema.no}. tema · ${test.soru} soru`)
                    )
                  )
                )
              )}
            </ul>
          </section>

          {sets.map(({ grade, data }) => (
            <section key={grade} className="card">
              <h3 className="card-title"><Icon name="list" /> {multi ? `${grade}. sınıf karma testleri` : 'Karma testler'}</h3>
              <p className="muted small">Bütün kazanımlardan karışık sorular. Deneme gibi çöz.</p>
              <ul className="test-list">
                {data.karma.map((test, index) => row(grade, test.id, `Karma test ${index + 1}`, `${test.soru} soru`))}
              </ul>
            </section>
          ))}
        </>
      )}

    </div>
  )
}
