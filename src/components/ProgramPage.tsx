import { useState } from 'react'
import Icon from './Icon'
import ReminderCard from './ReminderCard'
import { loadTopics } from '../data/topics'
import { getTopicProgress } from '../data/learningProgress'
import {
  localDate,
  updateStudyTasks,
  useStudyTasks,
  type StudyTask,
} from '../data/studyTasks'
import {
  KIND_LABEL,
  mondayOf,
  planWeek,
  taskMinutes,
  weekDays,
  type PlannedTask,
} from '../data/planner'
import {
  profilEtiketi,
  profilSiniflari,
  purposeTitle,
  saveProfile,
  type StudentProfile,
} from '../data/profile'

type Props = {
  profile: StudentProfile
  onProfileChange: (profile: StudentProfile) => void
  onOpenLessons: () => void
  onOpenTopic: (grade: number, topicId: string, tab?: 'anlatim' | 'test' | 'etkinlik') => void
}

const dayShort = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const dayLong = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const minuteOptions = [20, 30, 45, 60, 90]

function formatMinutes(total: number) {
  if (total < 60) return `${total} dk`
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return minutes ? `${hours} sa ${minutes} dk` : `${hours} saat`
}

export default function ProgramPage({ profile, onProfileChange, onOpenLessons, onOpenTopic }: Props) {
  const tasks = useStudyTasks()
  const [weekOffset, setWeekOffset] = useState(0)
  const [editing, setEditing] = useState(false)
  const [draftDays, setDraftDays] = useState(profile.days)
  const [draftMinutes, setDraftMinutes] = useState(profile.dailyMinutes)
  const [preview, setPreview] = useState<PlannedTask[]>([])
  const [message, setMessage] = useState('')
  const [addingDay, setAddingDay] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [removed, setRemoved] = useState<StudyTask | null>(null)

  const grade = profile.grade
  const grades = profilSiniflari(profile)
  const gradeLabel =
    profilEtiketi(profile)
      ? `${profilEtiketi(profile)} (${grades.join(', ')}. sınıf konuları)`
      : `${grade}. sınıf`
  const today = localDate(new Date())
  const monday = mondayOf(weekOffset)
  const days = weekDays(monday)
  const rangeLabel = `${new Date(`${days[0].key}T12:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – ${new Date(`${days[6].key}T12:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`

  const weekTasks = tasks.filter(
    task => task.grade !== undefined && grades.includes(task.grade) && task.date >= days[0].key && task.date <= days[6].key
  )
  const done = weekTasks.filter(task => task.completed).length
  const weeklyMinutes = profile.days.length * profile.dailyMinutes

  function changeWeek(delta: number) {
    setWeekOffset(value => value + delta)
    setPreview([])
    setMessage('')
  }

  function saveRhythm() {
    if (draftDays.length === 0) {
      setMessage('En az bir çalışma günü seç.')
      return
    }
    const next: StudentProfile = {
      ...profile,
      days: [...draftDays].sort((a, b) => a - b),
      dailyMinutes: draftMinutes,
      updatedAt: new Date().toISOString(),
    }
    saveProfile(next)
    onProfileChange(next)
    setEditing(false)
    setPreview([])
    setMessage('Çalışma düzenin güncellendi. Geçmiş kayıtların korunur.')
  }

  function generate() {
    const topics = loadTopics()
      .filter(topic => grades.includes(topic.grade))
      .map(topic => {
        const progress = getTopicProgress(topic.grade, topic.id)
        return {
          id: topic.id,
          grade: topic.grade,
          title: topic.title,
          status: progress?.status ?? ('not_started' as const),
          learnedAt: progress?.learnedAt ?? null,
        }
      })

    if (topics.length === 0) {
      setPreview([])
      setMessage(`${gradeLabel} için önce Derslerim sayfasından konu eklemelisin.`)
      return
    }

    const result = planWeek({
      grades,
      days,
      studyWeekdays: profile.days,
      dailyMinutes: profile.dailyMinutes,
      topics,
      tasks,
      today,
    })

    setPreview(result)
    setMessage(
      result.length
        ? `${result.length} görev önerildi. Kontrol edip kaydet.`
        : 'Bu hafta için eklenecek yeni görev yok. Konuların planlanmış ya da bu haftanın çalışma günleri geçmiş olabilir.'
    )
  }

  function savePreview() {
    updateStudyTasks(previous => [
      ...previous,
      ...preview.map(item => ({
        id: crypto.randomUUID(),
        title: item.title,
        date: item.date,
        grade: item.grade,
        completed: false,
        kind: item.kind,
        topicId: item.topicId,
        minutes: item.minutes,
        reviewDue: item.reviewDue,
      })),
    ])
    setMessage(`${preview.length} görev programına eklendi.`)
    setPreview([])
  }

  function toggle(task: StudyTask) {
    updateStudyTasks(previous =>
      previous.map(item => (item.id === task.id ? { ...item, completed: !item.completed } : item))
    )
  }

  function remove(task: StudyTask) {
    setRemoved(task)
    updateStudyTasks(previous => previous.filter(item => item.id !== task.id))
  }

  function addCustom(date: string) {
    const title = newTitle.trim()
    if (!title) return
    updateStudyTasks(previous => [
      ...previous,
      { id: crypto.randomUUID(), title, date, grade, completed: false, kind: 'custom', minutes: 15 },
    ])
    setNewTitle('')
    setAddingDay(null)
  }

  return (
<div className="stack">
      {removed && <div className="undo-notice" role="status"><span>Görev kaldırıldı: {removed.title}</span><button className="btn-secondary" onClick={() => { updateStudyTasks(previous => previous.some(t => t.id === removed.id) ? previous : [...previous, removed]); setRemoved(null) }}>Geri al</button><button className="btn-ghost" aria-label="Bildirimi kapat" onClick={() => setRemoved(null)}>×</button></div>}
      <ReminderCard days={profile.days} dailyMinutes={profile.dailyMinutes} />
      <section className="card program-summary">
        <div className="program-summary-main">
          <small>{purposeTitle(profile.purpose)}</small>
          <h2>
            {gradeLabel} · haftada {profile.days.length} gün · günde {profile.dailyMinutes} dk
          </h2>
          <p className="muted">
            Haftalık hedef: {formatMinutes(weeklyMinutes)}
            {profile.goal ? ` · Hedefin: ${profile.goal}` : ''}
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setDraftDays(profile.days)
              setDraftMinutes(profile.dailyMinutes)
              setEditing(true)
            }}
          >
            <Icon name="pencil" size={16} /> Düzenle
          </button>
        )}

        {editing && (
          <div className="rhythm-editor">
            <h3 className="ob-label">Çalışma günlerin</h3>
            <div className="ob-days">
              {dayShort.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  className={draftDays.includes(index) ? 'chip is-active' : 'chip'}
                  onClick={() =>
                    setDraftDays(previous =>
                      previous.includes(index) ? previous.filter(day => day !== index) : [...previous, index]
                    )
                  }
                  aria-pressed={draftDays.includes(index)}
                  aria-label={dayLong[index]}
                >
                  {name}
                </button>
              ))}
            </div>
            <h3 className="ob-label">Günlük süre</h3>
            <div className="ob-days">
              {minuteOptions.map(minutes => (
                <button
                  key={minutes}
                  type="button"
                  className={draftMinutes === minutes ? 'chip is-active' : 'chip'}
                  onClick={() => setDraftMinutes(minutes)}
                  aria-pressed={draftMinutes === minutes}
                >
                  {minutes} dk
                </button>
              ))}
            </div>
            <div className="row-actions">
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Vazgeç</button>
              <button type="button" className="primary-button" onClick={saveRhythm}>Kaydet</button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="week-nav">
          <button type="button" className="btn-ghost" onClick={() => changeWeek(-1)} aria-label="Önceki hafta">‹</button>
          <div className="week-nav-title">
            <b>{weekOffset === 0 ? 'Bu hafta' : weekOffset === 1 ? 'Gelecek hafta' : weekOffset === -1 ? 'Geçen hafta' : rangeLabel}</b>
            <small>{rangeLabel}</small>
          </div>
          <button type="button" className="btn-ghost" onClick={() => changeWeek(1)} aria-label="Sonraki hafta">›</button>
          <span className="week-progress">{weekTasks.length ? `${done} / ${weekTasks.length} görev` : ''}</span>
          {preview.length === 0 ? (
            <button type="button" className="primary-button" onClick={generate}>
              Programı oluştur
            </button>
          ) : (
            <span className="row-actions">
              <button type="button" className="btn-ghost" onClick={() => { setPreview([]); setMessage('') }}>Vazgeç</button>
              <button type="button" className="primary-button" onClick={savePreview}>Önerileri kaydet</button>
            </span>
          )}
        </div>

        {message && (
          <p className="program-message">
            {message}
            {message.includes('konu eklemelisin') && (
              <button type="button" className="btn-secondary" onClick={onOpenLessons}>Konu ekle</button>
            )}
          </p>
        )}

        <div className="week-grid">
          {days.map(day => {
            const isStudyDay = profile.days.includes(day.weekday)
            const dayTasks = weekTasks.filter(task => task.date === day.key)
            const dayPreview = preview.filter(item => item.date === day.key)
            const used = [...dayTasks].reduce((sum, task) => sum + taskMinutes(task), 0)
              + dayPreview.reduce((sum, item) => sum + item.minutes, 0)
            const isPast = day.key < today
            const date = new Date(`${day.key}T12:00`)

            return (
              <div
                key={day.key}
                className={[
                  'day-card',
                  day.key === today ? 'is-today' : '',
                  isStudyDay ? '' : 'is-rest',
                  isPast ? 'is-past' : '',
                ].join(' ')}
              >
                <div className="day-head">
                  <b>{dayShort[day.weekday]}</b>
                  <span>{date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                  {day.key === today && <em>Bugün</em>}
                  {isStudyDay && (
                    <small className={used > profile.dailyMinutes ? 'over' : ''}>
                      {used}/{profile.dailyMinutes} dk
                    </small>
                  )}
                </div>

                {!isStudyDay && dayTasks.length === 0 && dayPreview.length === 0 && (
                  <p className="rest-label">Dinlenme günü</p>
                )}

                <ul className="day-tasks">
                  {dayTasks.map(task => (
                    <li key={task.id} className={`kind-${task.kind ?? 'custom'}${task.completed ? ' is-done' : ''}`}>
                      <button
                        type="button"
                        className="task-check"
                        onClick={() => toggle(task)}
                        aria-label={task.completed ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
                      >
                        <Icon name={task.completed ? 'circleCheck' : 'circle'} size={18} />
                      </button>
                      <span className="task-title">
                        {task.kind && task.kind !== 'custom' && task.title.includes(' · ')
                          ? task.title.split(' · ')[0]
                          : task.title}
                        {task.kind && task.kind !== 'custom' && (
                          <small>{KIND_LABEL[task.kind]} · {taskMinutes(task)} dk</small>
                        )}
                      </span>
                      {task.topicId && task.grade && <button className="task-open" onClick={() => onOpenTopic(task.grade!, task.topicId!, task.kind === 'quiz' || task.kind === 'review' ? 'test' : 'anlatim')}>Başla →</button>}
                      <button
                        type="button"
                        className="btn-ghost tiny"
                        onClick={() => remove(task)}
                        aria-label={`${task.title} görevini sil`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                  {dayPreview.map(item => (
                    <li key={`${item.kind}-${item.topicId}`} className={`kind-${item.kind} is-preview`}>
                      <span className="task-check"><Icon name="plus" size={18} /></span>
                      <span className="task-title">
                        {item.title.split(' · ')[0]}
                        <small>{KIND_LABEL[item.kind]} · {item.minutes} dk · öneri</small>
                      </span>
                    </li>
                  ))}
                </ul>

                {!isPast && (addingDay === day.key ? (
                  <form
                    className="day-add"
                    onSubmit={event => {
                      event.preventDefault()
                      addCustom(day.key)
                    }}
                  >
                    <input
                      value={newTitle}
                      onChange={event => setNewTitle(event.target.value)}
                      placeholder="Görev"
                      aria-label={`${dayLong[day.weekday]} için görev`}
                      autoFocus
                    />
                    <button type="submit" className="btn-ghost tiny" aria-label="Ekle"><Icon name="check" size={16} /></button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="day-add-btn"
                    onClick={() => {
                      setAddingDay(day.key)
                      setNewTitle('')
                    }}
                  >
                    + Görev
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        <div className="legend program-legend">
          <span><b className="dot-purple" />{KIND_LABEL.study}</span>
          <span><b className="dot-teal" />{KIND_LABEL.quiz}</span>
          <span><b className="dot-amber" />{KIND_LABEL.review}</span>
          <span><b className="dot-gray" />kendi görevin</span>
        </div>
      </section>
    </div>
  )
}
