
import { useState } from 'react'
import {
  addQuestion,
  deleteQuestion,
  getQuestionsByTopic,
  downloadQuestionBankJSON,
  isLocalQuestion,
} from '../data/questionBank'
import { loadTopics } from '../data/topics'

export default function QuestionBankManager() {
  const [grade, setGrade] = useState(9)
  const [topics, setTopics] = useState(loadTopics)
  const [topicId, setTopicId] = useState('')
  const [question, setQuestion] = useState('')
  const [choices, setChoices] = useState({
    A: '',
    B: '',
    C: '',
    D: '',
    E: '',
  })
  const [correctAnswer, setCorrectAnswer] = useState('A')
  const [explanation, setExplanation] = useState('')
  const [message, setMessage] = useState('')
  const [, setRevision] = useState(0)

  const availableTopics = topics.filter(
    topic => topic.grade === grade
  )

  const questions = topicId
    ? getQuestionsByTopic(grade, topicId)
    : []

  function refresh() {
    setTopics(loadTopics())
    setRevision(value => value + 1)
  }

  function saveQuestion() {
    setMessage('')

    if (!topicId) {
      setMessage('Önce bir konu seçmelisin.')
      return
    }

    if (!question.trim()) {
      setMessage('Soru metni boş olamaz.')
      return
    }

    if (
      Object.values(choices).some(
        value => !value.trim()
      )
    ) {
      setMessage('Bütün seçenekleri doldurmalısın.')
      return
    }

    try {
      addQuestion({
        grade,
        topicId,
        type: 'multiple_choice',
        question,
        choices,
        correctAnswer,
        explanation,
        maxPoints: 20,
      })

      setQuestion('')
      setChoices({
        A: '',
        B: '',
        C: '',
        D: '',
        E: '',
      })
      setCorrectAnswer('A')
      setExplanation('')
      setRevision(value => value + 1)
      setMessage('✓ Soru başarıyla kaydedildi.')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Soru kaydedilemedi.'
      )
    }
  }

  function removeQuestion(id: string) {
    if (!window.confirm('Bu soruyu silmek istiyor musun?')) {
      return
    }

    try {
      deleteQuestion(id)
      setRevision(value => value + 1)
      setMessage('Soru silindi.')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Soru silinemedi.'
      )
    }
  }

  return (
    <section className="dashboard-card">
      <div className="card-icon">🗂️</div>
      <h2>Soru Havuzu Yönetimi</h2>

      <p>
        Kimya konularına değerlendirme soruları ekle.
      </p>

      <button type="button" onClick={refresh}>
        🔄 Konuları Yenile
      </button>
      <div style={{ marginTop: 12 }}>
        <button
            type="button"
            onClick={downloadQuestionBankJSON}
        >
            📥 Soru Havuzunu JSON İndir
        </button>
        </div>

      <div style={{ marginTop: 16 }}>
        <label>
          Sınıf
          <select
            value={grade}
            onChange={event => {
              setGrade(Number(event.target.value))
              setTopicId('')
            }}
          >
            {[9, 10, 11, 12].map(value => (
              <option key={value} value={value}>
                {value}. Sınıf
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>
          Konu
          <select
            value={topicId}
            onChange={event =>
              setTopicId(event.target.value)
            }
          >
            <option value="">Konu seçiniz</option>

            {availableTopics.map(topic => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {topicId && (
        <>
          <div style={{ marginTop: 20 }}>
            <h3>Yeni Çoktan Seçmeli Soru</h3>

            <textarea
              value={question}
              onChange={event =>
                setQuestion(event.target.value)
              }
              placeholder="Soru metnini yaz..."
              rows={4}
              style={{ width: '100%' }}
            />

            {Object.entries(choices).map(([key, value]) => (
              <div key={key} style={{ marginTop: 10 }}>
                <label>
                  {key} seçeneği
                  <input
                    type="text"
                    value={value}
                    onChange={event =>
                      setChoices(current => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    style={{ width: '100%' }}
                  />
                </label>
              </div>
            ))}

            <div style={{ marginTop: 12 }}>
              <label>
                Doğru cevap
                <select
                  value={correctAnswer}
                  onChange={event =>
                    setCorrectAnswer(event.target.value)
                  }
                >
                  {Object.keys(choices).map(key => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <textarea
              value={explanation}
              onChange={event =>
                setExplanation(event.target.value)
              }
              placeholder="Çözüm veya açıklama (isteğe bağlı)"
              rows={3}
              style={{
                width: '100%',
                marginTop: 12,
              }}
            />

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={saveQuestion}
              >
                💾 Soruyu Kaydet
              </button>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <h3>Kayıtlı Sorular ({questions.length})</h3>

            {questions.map((item, index) => (
              <div
                key={item.id}
                style={{
                  padding: 14,
                  marginTop: 10,
                  borderRadius: 12,
                  background: '#f3f0ff',
                }}
              >
                <strong>
                  Soru {index + 1}: {item.question}
                </strong>

                {Object.entries(item.choices ?? {}).map(
                  ([key, value]) => (
                    <p key={key}>
                      {key}) {value}
                    </p>
                  )
                )}

                <p>
                  Doğru cevap: {item.correctAnswer}
                </p>

                
                {isLocalQuestion(item.id) ? (
                <button
                    type="button"
                    onClick={() => removeQuestion(item.id)}
                >
                    🗑️ Sil
                </button>
                ) : (
                <p
                    style={{
                    color: '#6542c0',
                    fontSize: 13,
                    fontWeight: 600,
                    }}
                >
                    📦 JSON dosyasından yüklenen soru
                </p>
                )}

              </div>
            ))}
          </div>
        </>
      )}

      {message && (
        <p role="status" style={{ marginTop: 16 }}>
          {message}
        </p>
      )}
    </section>
  )
}
