import { useState } from 'react'
import Icon from './Icon'
import { purposes, type StudyPurpose } from '../data/profile'

// Öğretmen için: uygulamayı seçilen sınıf ve amaçla bir öğrenci gibi
// geçici olarak dene. Gerçek profil değişmez; uygulama kapanınca biter.
export default function StudentPreviewCard({
  onStart,
}: {
  onStart: (next: { grade: number; purpose: StudyPurpose }) => void
}) {
  const [grade, setGrade] = useState(9)
  const [purpose, setPurpose] = useState<StudyPurpose>('school')

  return (
    <section className="card preview-card">
      <h3 className="card-title">
        <Icon name="play" />
        Öğrenci gibi dene
      </h3>
      <p className="muted small">
        Sınıfı ve amacı seç, uygulama o öğrencinin göreceği gibi açılsın. Geçicidir; "Önizlemeyi bitir" deyince
        ya da uygulamayı kapatınca kendi görünümüne dönersin. Deneme sırasında yaptığın çalışmalar bu cihazda kaydedilir; asıl sınıf ve amaç seçimin değişmez.
      </p>
      <div className="grade-picker" role="group" aria-label="Sınıf">
        {[9, 10, 11, 12].map(g => (
          <button
            key={g}
            type="button"
            className={grade === g ? 'chip is-active' : 'chip'}
            aria-pressed={grade === g}
            onClick={() => setGrade(g)}
          >
            {g}. sınıf
          </button>
        ))}
      </div>
      <label className="coach-select">
        <span className="muted small">Amaç</span>
        <select value={purpose} onChange={e => setPurpose(e.target.value as StudyPurpose)}>
          {purposes.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </label>
      <button type="button" className="primary-button" onClick={() => onStart({ grade, purpose })}>
        Önizlemeyi başlat
      </button>
    </section>
  )
}
