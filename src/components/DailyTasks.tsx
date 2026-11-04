
import { useEffect, useState } from 'react'
import Icon from './Icon'
import {
  localDate,
  updateStudyTasks,
  useStudyTasks,
} from '../data/studyTasks'

type Props = {
  selectedGrade: number | null
  grades?: number[]
  onOpenTopic?: (grade: number, topicId: string, tab?: 'anlatim' | 'test' | 'etkinlik') => void
}

export default function DailyTasks({
  selectedGrade,
  grades = [],
  onOpenTopic,
}: Props) {
  const tasks = useStudyTasks()
  const [today, setToday] = useState(() => localDate(new Date()))
  const [title, setTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => {
      setToday(localDate(new Date()))
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const visible = tasks
    .filter(task =>
      task.date === today &&
      (selectedGrade === null ||
        task.grade === selectedGrade ||
        task.grade === undefined ||
        grades.includes(task.grade))
    )
    .sort((a, b) => Number(a.completed) - Number(b.completed))

  const completed = visible.filter(task => task.completed).length
  const progress = visible.length
    ? Math.round(completed / visible.length * 100)
    : 0

  function add() {
    if (selectedGrade === null || !title.trim()) return

    updateStudyTasks(previous => [
      ...previous,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        date: today,
        grade: selectedGrade,
        completed: false,
      },
    ])
    setTitle('')
  }

  function toggle(id: string, completed: boolean) {
    updateStudyTasks(previous =>
      previous.map(task =>
        task.id === id ? { ...task, completed } : task
      )
    )
  }

  function saveEdit(id: string) {
    if (!editingTitle.trim()) return

    updateStudyTasks(previous =>
      previous.map(task =>
        task.id === id
          ? { ...task, title: editingTitle.trim() }
          : task
      )
    )
    setEditingId(null)
    setEditingTitle('')
  }

  function remove(id: string, taskTitle: string) {
    if (!window.confirm(`"${taskTitle}" silinsin mi?`)) return
    updateStudyTasks(previous =>
      previous.filter(task => task.id !== id)
    )
    if (editingId === id) setEditingId(null)
  }

  return (
    <section className="card">
      <h3 className="card-title">
        <Icon name="list" />
        Bugünkü görevlerim
        <span className="card-link">
          {visible.length ? `${completed} / ${visible.length}` : ''}
        </span>
      </h3>

      {visible.length === 0 && (
        <p className="muted">Bugün için henüz görev yok.</p>
      )}

      <ul className="task-list">
        {visible.map(task => (
          <li key={task.id} className={task.completed ? 'is-done' : ''}>
            {editingId === task.id ? (
              <form
                className="task-edit"
                onSubmit={event => {
                  event.preventDefault()
                  saveEdit(task.id)
                }}
              >
                <input
                  value={editingTitle}
                  onChange={event => setEditingTitle(event.target.value)}
                  aria-label="Görevi düzenle"
                  autoFocus
                />
                <button type="submit" className="btn-secondary">Kaydet</button>
                <button type="button" className="btn-ghost" onClick={() => setEditingId(null)}>
                  İptal
                </button>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  className="task-check"
                  onClick={() => toggle(task.id, !task.completed)}
                  aria-label={task.completed ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
                >
                  <Icon name={task.completed ? 'circleCheck' : 'circle'} />
                </button>
                <span className="task-title">{task.title}</span>
                {task.topicId && task.grade && onOpenTopic && <button className="btn-secondary task-start" onClick={() => onOpenTopic(task.grade!, task.topicId!, task.kind === 'quiz' || task.kind === 'review' ? 'test' : 'anlatim')}>Başla →</button>}
                <span className="task-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setEditingId(task.id)
                      setEditingTitle(task.title)
                    }}
                    aria-label={`${task.title} görevini düzenle`}
                  >
                    <Icon name="pencil" size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => remove(task.id, task.title)}
                    aria-label={`${task.title} görevini sil`}
                  >
                    ×
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>

      <form
        className="task-add"
        onSubmit={event => {
          event.preventDefault()
          add()
        }}
      >
        <input
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder={
            selectedGrade === null
              ? 'Önce sınıfını seç'
              : 'Bugün ne çalışacaksın?'
          }
          aria-label="Yeni görev"
          disabled={selectedGrade === null}
        />
        <button
          type="submit"
          className="btn-secondary"
          disabled={selectedGrade === null || !title.trim()}
        >
          Ekle
        </button>
      </form>

      {visible.length > 0 && progress === 100 && (
        <p className="success-text">Bugünkü tüm görevlerini tamamladın.</p>
      )}
    </section>
  )
}
