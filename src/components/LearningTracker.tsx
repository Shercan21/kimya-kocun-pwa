import { useState } from 'react'
import Icon from './Icon'
import MiniAssessment from './MiniAssessment'
import {
  getTopicProgress,
  setTopicProgress,
  type LearningStatus,
} from '../data/learningProgress'
import { loadTopics, type StudyTopic } from '../data/topics'

type Props = {
  selectedGrade: number | null
}

// Konu haritasıyla aynı renkler: gri → mor → turkuaz → amber.
const statusView: Record<LearningStatus, { label: string; tone: string }> = {
  not_started: { label: 'Başlanmadı', tone: 'gray' },
  studied: { label: 'Çalışıldı', tone: 'purple' },
  learned: { label: 'Öğrenildi', tone: 'teal' },
  permanent: { label: 'Kalıcı', tone: 'amber' },
}

export default function LearningTracker({
  selectedGrade,
}: Props) {
  const [topics, setTopics] = useState<StudyTopic[]>(loadTopics)
  const [, setRevision] = useState(0)
  const [openAssessmentId, setOpenAssessmentId] =
    useState<string | null>(null)

  const visibleTopics = topics.filter(
    topic => topic.grade === selectedGrade
  )

  function refresh() {
    setTopics(loadTopics())
    setRevision(value => value + 1)
  }

  function markStudied(topic: StudyTopic) {
    setTopicProgress(
      topic.grade,
      topic.id,
      topic.title,
      'studied'
    )
    setRevision(value => value + 1)
  }

  function getStatus(topic: StudyTopic): LearningStatus {
    return getTopicProgress(
      topic.grade,
      topic.id
    )?.status ?? 'not_started'
  }

  const studied = visibleTopics.filter(
    topic => getStatus(topic) === 'studied'
  ).length

  const learned = visibleTopics.filter(
    topic => getStatus(topic) === 'learned'
  ).length

  const permanent = visibleTopics.filter(
    topic => getStatus(topic) === 'permanent'
  ).length

  const started = studied + learned + permanent

  const progress = visibleTopics.length
    ? Math.round(started / visibleTopics.length * 100)
    : 0

  return (
    <section className="card">
      <h3 className="card-title">
        <Icon name="brain" />
        Öğrenme takibim
        {selectedGrade !== null && (
          <button
            type="button"
            className="card-link link-button"
            onClick={refresh}
          >
            Yenile
          </button>
        )}
      </h3>

      {selectedGrade === null ? (
        <p className="muted">Öğrenme durumlarını görmek için önce sınıfını seç.</p>
      ) : (
        <>
          <div className="stats stats-4">
            {[
              ['Toplam konu', visibleTopics.length],
              ['Çalışıldı', studied],
              ['Öğrenildi', learned],
              ['Kalıcı', permanent],
            ].map(([label, value]) => (
              <div key={label} className="stat">
                <small>{label}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="small muted">
            Başlanan konular: %{progress}
          </p>

          {visibleTopics.length === 0 ? (
            <p className="muted">
              Henüz konu yok. Konularım kartından konu ekle.
            </p>
          ) : (
            <ul className="topic-rows">
              {visibleTopics.map(topic => {
                const status = getStatus(topic)
                const view = statusView[status]
                const isOpen = openAssessmentId === topic.id

                return (
                  <li key={topic.id} className={`topic-row tone-${view.tone}`}>
                    <div className="topic-row-head">
                      <span className="row-title">{topic.title}</span>
                      <span className={`pill pill-${view.tone}`}>
                        {view.label}
                      </span>
                    </div>

                    <div className="card-actions">
                      {status === 'not_started' ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => markStudied(topic)}
                        >
                          <Icon name="check" size={16} />
                          Çalıştım
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={isOpen ? 'btn-secondary' : 'primary-button'}
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenAssessmentId(current =>
                              current === topic.id ? null : topic.id
                            )
                          }
                        >
                          <Icon name="flask" size={16} />
                          {isOpen ? 'Sınavı kapat' : 'Mini sınav'}
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <div className="assessment-box">
                        <MiniAssessment
                          key={topic.id}
                          grade={topic.grade}
                          topicId={topic.id}
                          topicTitle={topic.title}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
