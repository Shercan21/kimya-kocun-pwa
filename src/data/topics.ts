import publishedQuestionBank from './questionBankData.json'
import { icerikliSiniflar, konuId, tumKonular } from './content'

export type StudyTopic = {
  id: string
  title: string
  grade: number
  createdAt: string
  // Soru havuzuyla birlikte gelen konular silinemez.
  builtIn?: boolean
}

export const TOPICS_KEY = 'kimya-kocun-pwa-study-topics'

type PublishedTopic = { id: string; title: string; grade: number }

function isPublishedTopic(value: unknown): value is PublishedTopic {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<PublishedTopic>
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.grade === 'number'
  )
}

const publishedTopics: unknown[] =
  'topics' in publishedQuestionBank &&
  Array.isArray(publishedQuestionBank.topics)
    ? publishedQuestionBank.topics
    : []

// Müfredattaki konular (9, 10, 11) + eski soru havuzunun konuları.
// İçeriği hazır sınıflarda eski havuz konuları gösterilmez.
const curriculumTopics = (): StudyTopic[] => icerikliSiniflar().flatMap(grade =>
  tumKonular(grade).map(({ konu }) => ({
    id: konuId(grade, konu.kod),
    title: konu.ad,
    grade,
    createdAt: '2026-11-02T00:00:00.000Z',
    builtIn: true,
  }))
)

export const builtInTopics = (): StudyTopic[] => [
  ...curriculumTopics(),
  ...publishedTopics
    .filter(isPublishedTopic)
    .filter(topic => !icerikliSiniflar().includes(topic.grade))
    .map(topic => ({
      id: topic.id,
      title: topic.title,
      grade: topic.grade,
      createdAt: '2026-11-01T00:00:00.000Z',
      builtIn: true,
    })),
]

const builtInIds = () => new Set(builtInTopics().map(topic => topic.id))

function loadLocalTopics(): StudyTopic[] {
  try {
    const raw = localStorage.getItem(TOPICS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is StudyTopic =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.grade === 'number' &&
      typeof item.createdAt === 'string' &&
      !builtInIds().has(item.id)
    )
  } catch {
    return []
  }
}

// Hazır konular önce, öğrencinin eklediği konular sonra gelir.
export function loadTopics(): StudyTopic[] {
  return [...builtInTopics(), ...loadLocalTopics()]
}

// Yalnızca öğrencinin eklediği konular kaydedilir.
export function saveTopics(topics: StudyTopic[]): void {
  localStorage.setItem(
    TOPICS_KEY,
    JSON.stringify(
      topics
        .filter(topic => !builtInIds().has(topic.id))
        .map(topic => ({
          id: topic.id,
          title: topic.title,
          grade: topic.grade,
          createdAt: topic.createdAt,
        }))
    )
  )
}
