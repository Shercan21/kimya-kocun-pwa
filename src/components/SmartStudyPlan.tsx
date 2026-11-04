
import { useState } from 'react'
import Icon from './Icon'
import {
  localDate,
  updateStudyTasks,
  useStudyTasks,
} from '../data/studyTasks'
import { loadTopics, type StudyTopic } from '../data/topics'

type Props = {
  selectedGrade: number | null
}

type StudyPreferences = {
  dailyMinutes: number
  days: number[]
  goal: string
}

type PlannedTask = {
  title: string
  date: string
  grade: number
}

const PREFERENCES_KEY = 'kimya-kocun-pwa-study-preferences'
const dayNames = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
]

const defaultPreferences: StudyPreferences = {
  dailyMinutes: 45,
  days: [0, 1, 2, 3, 4],
  goal: 'school',
}

function loadPreferences(): StudyPreferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (!raw) return defaultPreferences

    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object') {
      return defaultPreferences
    }

    const item = data as Partial<StudyPreferences>

    return {
      dailyMinutes:
        typeof item.dailyMinutes === 'number' &&
        [20, 30, 45, 60, 90].includes(item.dailyMinutes)
          ? item.dailyMinutes
          : 45,
      days: Array.isArray(item.days)
        ? [...new Set(item.days.filter(
            (day): day is number =>
              typeof day === 'number' &&
              Number.isInteger(day) &&
              day >= 0 &&
              day <= 6
          ))].sort((a, b) => a - b)
        : [0, 1, 2, 3, 4],
      goal: typeof item.goal === 'string'
        ? item.goal
        : 'school',
    }
  } catch {
    return defaultPreferences
  }
}

function getMonday(offset: number): Date {
  const now = new Date()
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12
  )

  monday.setDate(
    monday.getDate() -
    ((monday.getDay() + 6) % 7) +
    offset * 7
  )

  return monday
}

export default function SmartStudyPlan({
  selectedGrade,
}: Props) {
  const tasks = useStudyTasks()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => localDate(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)

  const [preferences, setPreferences] =
    useState<StudyPreferences>(loadPreferences)

  const [topics, setTopics] =
    useState<StudyTopic[]>(loadTopics)

  const [preview, setPreview] = useState<PlannedTask[]>([])
  const [message, setMessage] = useState('')

  const monday = getMonday(weekOffset)

  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)

    return {
      key: localDate(day),
      label: dayNames[index],
      dateLabel: day.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      }),
      isStudyDay: preferences.days.includes(index),
    }
  })

  const weekly = tasks.filter(task =>
    selectedGrade !== null &&
    task.grade === selectedGrade &&
    task.date >= days[0].key &&
    task.date <= days[6].key
  )

  const completed = weekly.filter(task => task.completed).length
  const progress = weekly.length
    ? Math.round(completed / weekly.length * 100)
    : 0

  function refreshData() {
    setPreferences(loadPreferences())
    setTopics(loadTopics())
    setPreview([])
    setMessage('Tercihler ve konular güncellendi.')
  }

  function add() {
    if (selectedGrade === null || !title.trim() || !date) return

    updateStudyTasks(previous => [
      ...previous,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        grade: selectedGrade,
        date,
        completed: false,
      },
    ])

    setTitle('')
    setPreview([])
    setMessage('Görev eklendi.')
  }

  function toggle(id: string, completed: boolean) {
    updateStudyTasks(previous =>
      previous.map(task =>
        task.id === id ? { ...task, completed } : task
      )
    )
  }

  function remove(id: string, taskTitle: string) {
    if (!window.confirm(`"${taskTitle}" silinsin mi?`)) return

    updateStudyTasks(previous =>
      previous.filter(task => task.id !== id)
    )

    setPreview([])
  }

  function generatePreview() {
    if (selectedGrade === null) return

    const currentPreferences = loadPreferences()
    const currentTopics = loadTopics()

    setPreferences(currentPreferences)
    setTopics(currentTopics)

    const gradeTopics = currentTopics.filter(
      topic => topic.grade === selectedGrade
    )

    if (gradeTopics.length === 0) {
      setPreview([])
      setMessage('Önce Çalışılacak Konularım bölümüne konu ekle.')
      return
    }

    const studyDays = days.filter(day =>
      currentPreferences.days.includes(
        dayNames.indexOf(day.label)
      )
    )

    if (studyDays.length === 0) {
      setPreview([])
      setMessage('En az bir çalışma günü seçmelisin.')
      return
    }

    const todayKey = localDate(new Date())
    const availableDays = studyDays.filter(
      day => day.key >= todayKey
    )

    if (availableDays.length === 0) {
      setPreview([])
      setMessage(
        'Bu haftada kalan çalışma günü yok. Sonraki haftayı seç.'
      )
      return
    }

    const generated: PlannedTask[] = []
    let topicIndex = 0

    // İlk sürüm: Her çalışma gününe bir konu.
    // Günlük süre, o günün hedef çalışma süresidir.
    for (const day of availableDays) {
      const existingTitles = new Set(
        tasks
          .filter(task =>
            task.grade === selectedGrade &&
            task.date === day.key
          )
          .map(task =>
            task.title.trim().toLocaleLowerCase('tr-TR')
          )
      )

      let selectedTopic: StudyTopic | undefined

      // Aynı tarihe aynı konuyu ikinci kez yerleştirme.
      for (let attempt = 0; attempt < gradeTopics.length; attempt++) {
        const candidate =
          gradeTopics[(topicIndex + attempt) % gradeTopics.length]

        const normalized =
          candidate.title.trim().toLocaleLowerCase('tr-TR')

        if (!existingTitles.has(normalized)) {
          selectedTopic = candidate
          topicIndex =
            (topicIndex + attempt + 1) % gradeTopics.length
          break
        }
      }

      if (selectedTopic) {
        generated.push({
          title: selectedTopic.title,
          date: day.key,
          grade: selectedGrade,
        })
      }
    }

    setPreview(generated)

    setMessage(
      generated.length > 0
        ? `${generated.length} günlük program hazır. Kaydetmeden önce kontrol et.`
        : 'Yeni görev oluşturulamadı. Bu günlerde konular zaten planlanmış olabilir.'
    )
  }

  function confirmPlan() {
    if (preview.length === 0) return

    let addedCount = 0

    updateStudyTasks(previous => {
      const next = [...previous]

      for (const item of preview) {
        const duplicate = next.some(task =>
          task.grade === item.grade &&
          task.date === item.date &&
          task.title.trim().toLocaleLowerCase('tr-TR') ===
            item.title.trim().toLocaleLowerCase('tr-TR')
        )

        if (duplicate) continue

        next.push({
          id: crypto.randomUUID(),
          title: item.title,
          grade: item.grade,
          date: item.date,
          completed: false,
        })

        addedCount++
      }

      return next
    })

    setPreview([])
    setMessage(`${addedCount} görev haftalık programa kaydedildi.`)
  }

  const topicCount = topics.filter(topic =>
    topic.grade === selectedGrade
  ).length
  const todayKey = localDate(new Date())

  function changeWeek(offset: number | null) {
    setWeekOffset(value => offset === null ? 0 : value + offset)
    setPreview([])
  }

  return (
    <section className="card">
      <h3 className="card-title">
        <Icon name="calendar" />
        Haftalık programım
        {selectedGrade !== null && (
          <span className="card-link week-nav">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => changeWeek(-1)}
              aria-label="Önceki hafta"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
            <button
              type="button"
              className="btn-ghost week-label"
              onClick={() => changeWeek(null)}
              title="Bu haftaya dön"
            >
              {days[0].dateLabel} – {days[6].dateLabel}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => changeWeek(1)}
              aria-label="Sonraki hafta"
            >
              <Icon name="chevronRight" size={18} />
            </button>
          </span>
        )}
      </h3>

      {selectedGrade === null ? (
        <p className="muted">Program oluşturmak için önce sınıfını seç.</p>
      ) : (
        <>
          <div className="plan-head">
            <div className="plan-progress">
              <div className="plan-progress-text">
                <b>{completed} / {weekly.length}</b>
                <span className="muted small">görev tamam · %{progress}</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="small muted">
                Haftada {preferences.days.length} gün · günde {preferences.dailyMinutes} dk ·
                {' '}{topicCount} konu
                <button
                  type="button"
                  className="link-button"
                  onClick={refreshData}
                >
                  Yenile
                </button>
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={generatePreview}
            >
              <Icon name="sparkles" size={18} />
              Programımı oluştur
            </button>
          </div>

          {message && (
            <p className="small muted" role="status">{message}</p>
          )}

          {preview.length > 0 && (
            <div className="preview">
              <p className="field-label">Program önizlemesi</p>
              <ul className="row-list">
                {preview.map(item => (
                  <li key={`${item.date}-${item.title}`}>
                    <span className="row-title">{item.title}</span>
                    <span className="muted small">
                      {new Date(`${item.date}T12:00:00`)
                        .toLocaleDateString('tr-TR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                        })} · {preferences.dailyMinutes} dk
                    </span>
                  </li>
                ))}
              </ul>

              <div className="card-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={confirmPlan}
                >
                  Onayla ve kaydet
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setPreview([])
                    setMessage('Önizleme iptal edildi.')
                  }}
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          <div className="week-cal">
            {days.map(day => {
              const dayTasks = weekly.filter(
                task => task.date === day.key
              )

              const classes = [
                'day',
                day.isStudyDay ? '' : 'is-rest',
                day.key === todayKey ? 'is-today' : '',
              ].filter(Boolean).join(' ')

              return (
                <div key={day.key} className={classes}>
                  <div className="day-head">
                    <b>{day.label}</b>
                    <span>{day.dateLabel}</span>
                  </div>

                  <small className="day-meta">
                    {day.isStudyDay
                      ? `${preferences.dailyMinutes} dk çalışma`
                      : 'Dinlenme'}
                  </small>

                  {dayTasks.length > 0 && (
                    <ul className="task-list day-tasks">
                      {dayTasks.map(task => (
                        <li
                          key={task.id}
                          className={task.completed ? 'is-done' : ''}
                        >
                          <button
                            type="button"
                            className="task-check"
                            onClick={() => toggle(task.id, !task.completed)}
                            aria-pressed={task.completed}
                            aria-label={`${task.title} tamamlandı`}
                          >
                            <Icon name={task.completed ? 'circleCheck' : 'circle'} size={18} />
                          </button>

                          <span className="task-title">{task.title}</span>

                          <span className="task-actions">
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() =>
                                remove(task.id, task.title)
                              }
                              aria-label={`${task.title} görevini sil`}
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          <form
            className="task-add plan-add"
            onSubmit={event => {
              event.preventDefault()
              add()
            }}
          >
            <input
              type="text"
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Programa görev ekle"
              aria-label="Çalışma görevi"
            />

            <input
              type="date"
              className="date-input"
              value={date}
              onChange={event => setDate(event.target.value)}
              aria-label="Çalışma tarihi"
            />

            <button
              type="submit"
              className="btn-secondary"
              disabled={!title.trim() || !date}
            >
              Ekle
            </button>
          </form>
        </>
      )}
    </section>
  )
}
