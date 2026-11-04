import { useState } from 'react'
import Icon from './Icon'
import { loadTopics, saveTopics, type StudyTopic } from '../data/topics'

type Props = {
  selectedGrade: number | null
}

export default function StudyTopics({ selectedGrade }: Props) {
  const [topics, setTopics] = useState<StudyTopic[]>(loadTopics)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')

  const visibleTopics = topics.filter(
    topic => topic.grade === selectedGrade
  )

  function addTopic() {
    const cleanedTitle = title.trim()

    if (!cleanedTitle || selectedGrade === null) return

    const alreadyExists = topics.some(
      topic =>
        topic.grade === selectedGrade &&
        topic.title.toLocaleLowerCase('tr-TR') ===
          cleanedTitle.toLocaleLowerCase('tr-TR')
    )

    if (alreadyExists) {
      setMessage('Bu konu zaten listende bulunuyor.')
      return
    }

    const next = [
      ...topics,
      {
        id: crypto.randomUUID(),
        title: cleanedTitle,
        grade: selectedGrade,
        createdAt: new Date().toISOString(),
      },
    ]

    try {
      saveTopics(next)
      setTopics(next)
      setTitle('')
      setMessage('Konu listene eklendi.')
    } catch {
      setMessage('Konu kaydedilemedi.')
    }
  }

  function deleteTopic(id: string, topicTitle: string) {
    if (!window.confirm(`"${topicTitle}" konusu silinsin mi?`)) {
      return
    }

    const next = topics.filter(topic => topic.id !== id)

    try {
      saveTopics(next)
      setTopics(next)
      setMessage('Konu listeden kaldırıldı.')
    } catch {
      setMessage('Konu silinemedi.')
    }
  }

  return (
    <section className="card">
      <h3 className="card-title">
        <Icon name="book" />
        Konularım
        {selectedGrade !== null && (
          <span className="count">{visibleTopics.length}</span>
        )}
      </h3>

      {selectedGrade === null ? (
        <p className="muted">Konu eklemek için önce sınıfını seç.</p>
      ) : (
        <>
          {visibleTopics.length === 0 ? (
            <p className="muted">Henüz çalışma konusu eklemedin.</p>
          ) : (
            <ol className="row-list">
              {visibleTopics.map((topic, index) => (
                <li key={topic.id}>
                  <span className="row-index">{index + 1}</span>
                  <span className="row-title">{topic.title}</span>

                  {topic.builtIn ? (
                    <span className="tag">Hazır konu</span>
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() =>
                        deleteTopic(topic.id, topic.title)
                      }
                      aria-label={`${topic.title} konusunu sil`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}

          <form
            className="task-add"
            onSubmit={event => {
              event.preventDefault()
              addTopic()
            }}
          >
            <input
              type="text"
              value={title}
              onChange={event => {
                setTitle(event.target.value)
                setMessage('')
              }}
              placeholder="Örneğin: Atomun yapısı"
              aria-label="Çalışılacak konu"
            />

            <button
              type="submit"
              className="btn-secondary"
              disabled={!title.trim()}
            >
              Ekle
            </button>
          </form>

          {message && (
            <p className="small muted" role="status">{message}</p>
          )}
        </>
      )}
    </section>
  )
}
