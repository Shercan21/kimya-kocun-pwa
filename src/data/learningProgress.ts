
export type LearningStatus =
  | 'not_started'
  | 'studied'
  | 'learned'
  | 'permanent'

export type LearningProgress = {
  id: string
  grade: number
  topicId: string
  topicTitle: string
  status: LearningStatus
  studiedAt: string | null
  learnedAt: string | null
  permanentAt: string | null
  updatedAt: string
}

const STORAGE_KEY = 'kimya-kocun-pwa-learning-progress-v1'

function isProgress(value: unknown): value is LearningProgress {
  if (!value || typeof value !== 'object') return false

  const item = value as Partial<LearningProgress>

  return (
    typeof item.id === 'string' &&
    typeof item.grade === 'number' &&
    typeof item.topicId === 'string' &&
    typeof item.topicTitle === 'string' &&
    (
      item.status === 'not_started' ||
      item.status === 'studied' ||
      item.status === 'learned' ||
      item.status === 'permanent'
    )
  )
}

export function loadLearningProgress(): LearningProgress[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)

    return Array.isArray(parsed)
      ? parsed.filter(isProgress)
      : []
  } catch {
    return []
  }
}

function saveLearningProgress(records: LearningProgress[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function getTopicProgress(
  grade: number,
  topicId: string
): LearningProgress | undefined {
  return loadLearningProgress().find(
    record =>
      record.grade === grade &&
      record.topicId === topicId
  )
}

export function setTopicProgress(
  grade: number,
  topicId: string,
  topicTitle: string,
  status: LearningStatus
): LearningProgress {
  const records = loadLearningProgress()
  const existing = records.find(
    record =>
      record.grade === grade &&
      record.topicId === topicId
  )

  const now = new Date().toISOString()

  const studiedAt =
    status === 'not_started'
      ? null
      : existing?.studiedAt ?? now

  const learnedAt =
    status === 'learned' || status === 'permanent'
      ? existing?.learnedAt ?? now
      : null

  const permanentAt =
    status === 'permanent'
      ? existing?.permanentAt ?? now
      : null

  const updated: LearningProgress = {
    id: existing?.id ?? crypto.randomUUID(),
    grade,
    topicId,
    topicTitle,
    status,
    studiedAt,
    learnedAt,
    permanentAt,
    updatedAt: now,
  }

  const next = records.filter(
    record =>
      !(record.grade === grade && record.topicId === topicId)
  )

  next.push(updated)
  saveLearningProgress(next)

  return updated
}

export function getGradeLearningSummary(grade: number) {
  const records = loadLearningProgress().filter(
    record => record.grade === grade
  )

  return {
    studied: records.filter(
      record => record.status === 'studied'
    ).length,
    learned: records.filter(
      record => record.status === 'learned'
    ).length,
    permanent: records.filter(
      record => record.status === 'permanent'
    ).length,
    total: records.length,
  }
}
