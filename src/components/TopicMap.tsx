import Icon, { type IconName } from './Icon'
import { loadTopics } from '../data/topics'
import {
  getTopicProgress,
  type LearningStatus,
} from '../data/learningProgress'

type Props = {
  grades: number[]
  label?: string
  onOpenLessons: () => void
}

const statusInfo: Record<
  LearningStatus,
  { label: string; icon: IconName; tone: string }
> = {
  not_started: { label: 'Başlanmadı', icon: 'lock', tone: 'gray' },
  studied: { label: 'Çalışıldı · mini sınav seni bekliyor', icon: 'book', tone: 'purple' },
  learned: { label: 'Öğrenildi · tekrarla kalıcı hâle getir', icon: 'check', tone: 'teal' },
  permanent: { label: 'Kalıcı öğrenildi', icon: 'star', tone: 'amber' },
}

export default function TopicMap({ grades, label, onOpenLessons }: Props) {
  const grade = grades.length ? grades[0] : null
  const topics = loadTopics().filter(topic => grades.includes(topic.grade))

  const withStatus = topics.map(topic => ({
    ...topic,
    status:
      getTopicProgress(topic.grade, topic.id)?.status ??
      ('not_started' as LearningStatus),
  }))

  // Sıradaki konu: ilk "çalışıldı", yoksa ilk "başlanmadı".
  const nextId =
    withStatus.find(topic => topic.status === 'studied')?.id ??
    withStatus.find(topic => topic.status === 'not_started')?.id

  // Uzun listelerde sıradaki konunun çevresindeki 6 konu gösterilir.
  const nextIndex = Math.max(0, withStatus.findIndex(topic => topic.id === nextId))
  const start = Math.max(0, Math.min(nextIndex - 2, withStatus.length - 6))
  const visible = withStatus.slice(start, start + 6)
  const hidden = withStatus.length - visible.length

  return (
    <section className="card topic-map-card">
      <h3 className="card-title">
        <Icon name="route" />
        Konu haritam
        {grade !== null && <span className="card-link">{label ?? `${grades.join(', ')}. sınıf`}</span>}
      </h3>

      <div className="legend">
        <span><b className="dot-gray" />Başlanmadı</span>
        <span><b className="dot-purple" />Çalışıldı</span>
        <span><b className="dot-teal" />Öğrenildi</span>
        <span><b className="dot-amber" />Kalıcı</span>
      </div>

      {grade === null && (
        <div className="empty">
          <p>Konu haritanı görmek için önce sınıfını seç.</p>
          <button type="button" className="btn-secondary" onClick={onOpenLessons}>
            Sınıfımı seç
          </button>
        </div>
      )}

      {grade !== null && withStatus.length === 0 && (
        <div className="empty">
          <p>{label ?? `${grade}. sınıf`} için henüz konu yok. Derslerim sayfasından konu ekleyebilirsin.</p>
          <button type="button" className="btn-secondary" onClick={onOpenLessons}>
            Konu ekle
          </button>
        </div>
      )}

      {withStatus.length > 0 && (
        <ol className="map">
          {visible.map(topic => {
            const info = statusInfo[topic.status]
            return (
              <li
                key={topic.id}
                className={`node tone-${info.tone}${topic.id === nextId ? ' is-next' : ''}`}
              >
                <span className="node-dot">
                  <Icon name={info.icon} size={15} />
                </span>
                <span className="node-title">{topic.title}</span>
                <small>{info.label}</small>
              </li>
            )
          })}
        </ol>
      )}

      {hidden > 0 && (
        <button type="button" className="btn-secondary" onClick={onOpenLessons}>
          Bütün konular ({withStatus.length})
        </button>
      )}
    </section>
  )
}
