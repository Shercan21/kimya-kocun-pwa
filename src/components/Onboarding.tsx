import { useState } from 'react'
import { useBackStep } from '../data/backNav'
import SignInButton from './SignInButton'
import { PrivacyLink } from './Privacy'
import { isTeacher, useCloud } from '../data/cloud'
import Icon from './Icon'
import {
  purposes,
  purposeTitle,
  saveProfile,
  type StudentProfile,
  type StudyPurpose,
} from '../data/profile'

type Props = {
  initial: StudentProfile | null
  onDone: (profile: StudentProfile) => void
  onCancel?: () => void
}

const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const dayLong = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const minuteOptions = [20, 30, 45, 60, 90]
const steps = ['Amaç', 'Sınıf', 'Çalışma düzeni', 'Sözleşme']

export default function Onboarding({ initial, onDone, onCancel }: Props) {
  const [step, setStep] = useState(0)
  const [purpose, setPurpose] = useState<StudyPurpose | null>(initial?.purpose ?? null)
  const [grade, setGrade] = useState<number | null>(initial?.grade ?? null)
  const [confirmGrade, setConfirmGrade] = useState(false)
  const [dailyMinutes, setDailyMinutes] = useState(initial?.dailyMinutes ?? 45)
  const [days, setDays] = useState<number[]>(initial?.days ?? [0, 1, 2, 3, 4])
  const [goal, setGoal] = useState(initial?.goal ?? '')
  const [error, setError] = useState('')
  const cloud = useCloud()
  // Sınıf yalnızca ilk girişte, bir kez seçilir. Öğretmen hesabıyla giriş
  // yapılmışsa kilit yoktur (test için istenen sınıf seçilebilir).
  const teacherMode = isTeacher(cloud.user)
  const gradeLocked = false

  // Yazılı, soru çözme ve eksik belirleme amaçlarında çalışma düzeni ve
  // sözleşme adımları sorulmaz; sınıf seçilince uygulama açılır.
  const kisa = purpose === 'written_exam' || purpose === 'practice' || purpose === 'gaps'
  const gorunenAdimlar = kisa ? steps.slice(0, 2) : steps

  function next() {
    if (step === 0 && !purpose) return setError('Devam etmek için bir seçenek seç.')
    if (step === 1 && !grade) return setError('Devam etmek için sınıfını seç.')
    if (step === 1 && grade !== initial?.grade && !confirmGrade) {
      setError('')
      setConfirmGrade(true)
      return
    }
    if (step === 1 && kisa) {
      setError('')
      return finish(initial?.contractAccepted ?? false)
    }
    if (step === 2 && days.length === 0) return setError('En az bir çalışma günü seç.')
    setError('')
    setStep(value => value + 1)
  }

  // Telefonun geri tuşu bir önceki adıma (ilk adımda, düzenlemedeyse kapatmaya) gider.
  useBackStep(step > 0 || confirmGrade, () => back())

  function back() {
    setError('')
    setConfirmGrade(false)
    if (step === 0) onCancel?.()
    else setStep(value => value - 1)
  }

  function finish(contractAccepted: boolean) {
    if (!purpose || !grade) return
    const now = new Date().toISOString()
    const profile: StudentProfile = {
      purpose,
      grade,
      dailyMinutes,
      days: [...days].sort((a, b) => a - b),
      goal: goal.trim(),
      contractAccepted,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    }
    saveProfile(profile)
    onDone(profile)
  }

  function toggleDay(day: number) {
    setError('')
    setDays(previous =>
      previous.includes(day)
        ? previous.filter(item => item !== day)
        : [...previous, day]
    )
  }

  const weeklyMinutes = days.length * dailyMinutes
  const weeklyText =
    weeklyMinutes >= 60
      ? `${Math.floor(weeklyMinutes / 60)} saat${weeklyMinutes % 60 ? ` ${weeklyMinutes % 60} dakika` : ''}`
      : `${weeklyMinutes} dakika`

  return (
    <div className="onboarding">
      <div className="ob-card">
        <div className="ob-top">
          <span className="brand-mark"><Icon name="flask" /></span>
          <div className="ob-steps" aria-label={`Adım ${step + 1} / ${gorunenAdimlar.length}`}>
            {gorunenAdimlar.map((name, index) => (
              <span
                key={name}
                className={index <= step ? 'is-on' : ''}
                title={name}
              />
            ))}
          </div>
          {onCancel && (
            <button type="button" className="btn-ghost" onClick={onCancel} aria-label="Kapat">
              ×
            </button>
          )}
        </div>

        {step === 0 && (
          <>
            {!initial && (
              <div className="ob-login">
                {cloud.user ? (
                  <p className="muted small">
                    {cloud.syncing ? 'Hesabın kontrol ediliyor…' : `${cloud.user.displayName ?? cloud.user.email} olarak giriş yaptın. Yeni profilin hesabına kaydedilecek.`}
                  </p>
                ) : (
                  <>
                    <p className="muted small">Daha önce kullandın mı? Giriş yap, ilerlemen geri gelsin.</p>
                    <SignInButton />
                    <p className="small"><PrivacyLink /></p>
                  </>
                )}
              </div>
            )}
            <h1>Ne yapmak istiyorsun?</h1>
            <p className="muted">Bunu istediğin zaman değiştirebilirsin.</p>
            <div className="ob-options">
              {purposes.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={[
                    'ob-option',
                    index === 0 ? 'is-main' : '',
                    purpose === item.id ? 'is-selected' : '',
                  ].join(' ')}
                  onClick={() => {
                    setPurpose(item.id)
                    setError('')
                  }}
                  aria-pressed={purpose === item.id}
                >
                  <span>
                    {item.title}
                    <small>{item.detail}</small>
                  </span>
                  {index === 0 && <em>Önerilen</em>}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Kaçıncı sınıftasın?</h1>
            {teacherMode ? (
              <p className="teacher-note">Öğretmen hesabı: sınıf kilidi yok, test için istediğin sınıfı seçebilirsin.</p>
            ) : gradeLocked ? (
              <p className="muted">Sınıf seçimi ilk girişte yapılır ve değiştirilemez.</p>
            ) : (
              <p className="grade-warning">
                <Icon name="lock" size={16} />
                Sınıfını değiştirebilirsin. Önceki sınıfındaki ilerlemen korunur.
              </p>
            )}
            <div className="ob-grades">
              {[9, 10, 11, 12].map(item => (
                <button
                  key={item}
                  type="button"
                  className={grade === item ? 'ob-grade is-selected' : 'ob-grade'}
                  disabled={gradeLocked && grade !== item}
                  onClick={() => {
                    if (gradeLocked) return
                    setGrade(item)
                    setConfirmGrade(false)
                    setError('')
                  }}
                  aria-pressed={grade === item}
                >
                  <b>{item}</b>
                  <span>{item === 12 ? '12. sınıf / mezun' : 'sınıf'}</span>
                </button>
              ))}
            </div>
            <p className="muted small grade-scope">
              9, 10 ve 11. sınıf öğrencileri kendi sınıflarının konularını görür.
              12. sınıf ve mezunlar TYT (9 ve 10. sınıf), AYT (11. sınıf) ve 12. sınıf konularını görür.
            </p>

            {confirmGrade && grade && (
              <div className="grade-confirm" role="alert">
                <b>{grade === 12 ? '12. sınıf / mezun' : `${grade}. sınıf`} seçtin.</b>
                <p>Bu sınıfın çalışma planını açacağız. Önceki ilerlemen korunacak. Devam edelim mi?</p>
                <div className="row-actions start">
                  <button type="button" className="btn-secondary" onClick={() => setConfirmGrade(false)}>
                    Değiştir
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setConfirmGrade(false)
                      if (kisa) finish(false)
                      else setStep(2)
                    }}
                  >
                    Evet, eminim
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h1>Nasıl çalışmak istersin?</h1>
            <p className="muted">Programını buna göre hazırlayacağız.</p>

            <h3 className="ob-label">Hangi günler?</h3>
            <div className="ob-days">
              {dayNames.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  className={days.includes(index) ? 'chip is-active' : 'chip'}
                  onClick={() => toggleDay(index)}
                  aria-pressed={days.includes(index)}
                  aria-label={dayLong[index]}
                >
                  {name}
                </button>
              ))}
            </div>

            <h3 className="ob-label">Günde ne kadar?</h3>
            <div className="ob-days">
              {minuteOptions.map(minutes => (
                <button
                  key={minutes}
                  type="button"
                  className={dailyMinutes === minutes ? 'chip is-active' : 'chip'}
                  onClick={() => setDailyMinutes(minutes)}
                  aria-pressed={dailyMinutes === minutes}
                >
                  {minutes} dk
                </button>
              ))}
            </div>

            <h3 className="ob-label">Hedefin <span className="muted">(isteğe bağlı)</span></h3>
            <input
              className="ob-input"
              type="text"
              value={goal}
              onChange={event => setGoal(event.target.value)}
              placeholder={
                purpose === 'tyt_ayt'
                  ? 'AYT kimyada 10 net'
                  : purpose === 'written_exam'
                    ? 'Kimya yazılısından 85 almak'
                    : 'Kimyayı sevmek ve anlamak'
              }
              aria-label="Hedefin"
            />

            <p className="ob-summary">
              Haftada <b>{days.length} gün</b>, toplam <b>{weeklyText}</b>
            </p>
          </>
        )}

        {step === 3 && purpose && grade && (
          <>
            <h1>Kişisel öğrenme sözleşmem</h1>
            <p className="muted">
              Gönüllü bir taahhüt. İstediğin zaman değiştirebilirsin.
            </p>
            <div className="ob-contract">
              <p><Icon name="target" size={18} /> {purposeTitle(purpose)}.</p>
              <p>
                <Icon name="book" size={18} /> {grade}. sınıf kimya
                {grade === 12 ? ' · TYT ve AYT hazırlığı' : ''}
              </p>
              <p>
                <Icon name="list" size={18} />
                {days.map(day => dayLong[day]).join(', ')} günleri, günde {dailyMinutes} dakika
              </p>
              {goal.trim() && <p><Icon name="star" size={18} /> Hedefim: {goal.trim()}</p>}
              <p className="ob-promise">
                Planladığım günlerde çalışmaya, yanlışlarımdan öğrenmeye ve
                gelişimimi düzenli takip etmeye çalışacağım.
              </p>
            </div>
          </>
        )}

        {error && <p className="ob-error" role="alert">{error}</p>}

        <div className="ob-actions">
          {(step > 0 || onCancel) && (
            <button type="button" className="btn-secondary" onClick={back}>
              {step === 0 ? 'Vazgeç' : 'Geri'}
            </button>
          )}
          {step < 3 ? (
            !confirmGrade && <button type="button" className="primary-button" onClick={next}>
              {step === 1 && kisa ? 'Başla' : 'Devam'}
            </button>
          ) : (
            <>
              <button type="button" className="btn-ghost ob-skip" onClick={() => finish(false)}>
                Şimdilik geç
              </button>
              <button type="button" className="primary-button" onClick={() => finish(true)}>
                Kabul ediyorum
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
