
import {
  loadAssessmentQuestions,
  saveAssessmentQuestions,
  type AssessmentQuestion,
  type AssessmentQuestionType,
} from './learningAssessment'

export type NewQuestion = {
  grade: number
  topicId: string
  type: AssessmentQuestionType
  question: string
  choices?: Record<string, string>
  correctAnswer?: string
  explanation?: string
  maxPoints: number
}

function validateQuestion(data: NewQuestion): void {
  if (
    !Number.isInteger(data.grade) ||
    data.grade < 9 ||
    data.grade > 12
  ) {
    throw new Error('Geçerli bir sınıf seçilmelidir.')
  }

  if (!data.topicId.trim()) {
    throw new Error('Soru için konu seçilmelidir.')
  }

  if (!data.question.trim()) {
    throw new Error('Soru metni boş olamaz.')
  }

  if (
    !Number.isFinite(data.maxPoints) ||
    data.maxPoints <= 0
  ) {
    throw new Error('Puan sıfırdan büyük olmalıdır.')
  }

  if (data.type === 'multiple_choice') {
    const choices = data.choices ?? {}
    const entries = Object.entries(choices)

    if (entries.length < 2) {
      throw new Error(
        'Çoktan seçmeli soruda en az iki seçenek olmalıdır.'
      )
    }

    if (
      entries.some(
        ([key, value]) => !key.trim() || !value.trim()
      )
    ) {
      throw new Error('Seçenekler boş olamaz.')
    }

    if (
      data.correctAnswer &&
      !Object.prototype.hasOwnProperty.call(
        choices,
        data.correctAnswer
      )
    ) {
      throw new Error(
        'Doğru cevap mevcut seçeneklerden biri olmalıdır.'
      )
    }
  }

  if (
    data.type === 'true_false' &&
    data.correctAnswer &&
    !['true', 'false'].includes(data.correctAnswer)
  ) {
    throw new Error(
      'Doğru-yanlış sorusunun cevabı true veya false olmalıdır.'
    )
  }
}

export function addQuestion(
  data: NewQuestion
): AssessmentQuestion {
  validateQuestion(data)

  const question: AssessmentQuestion = {
    id: crypto.randomUUID(),
    grade: data.grade,
    topicId: data.topicId,
    type: data.type,
    question: data.question.trim(),
    choices: data.choices,
    correctAnswer: data.correctAnswer,
    explanation: data.explanation,
    maxPoints: data.maxPoints,
  }

  const existing = loadAssessmentQuestions()

  saveAssessmentQuestions([...existing, question])

  return question
}

export function updateQuestion(
  questionId: string,
  changes: Partial<NewQuestion>
): AssessmentQuestion {
  const questions = loadAssessmentQuestions()
  const index = questions.findIndex(
    item => item.id === questionId
  )

  if (index === -1) {
    throw new Error('Düzenlenecek soru bulunamadı.')
  }

  const updated: AssessmentQuestion = {
    ...questions[index],
    ...changes,
    id: questionId,
  }

  validateQuestion(updated)

  questions[index] = updated
  saveAssessmentQuestions(questions)

  return updated
}

export function deleteQuestion(
  questionId: string
): void {
  const questions = loadAssessmentQuestions()

  const existing = questions.find(
    item => item.id === questionId
  )

  if (!existing) {
    throw new Error('Silinecek soru bulunamadı.')
  }

  // Geçmiş değerlendirmelerde kullanılan sorular korunur.
  const attempts = JSON.parse(
    localStorage.getItem(
      'kimya-kocun-pwa-assessment-attempts-v1'
    ) ?? '[]'
  ) as unknown

  if (
    Array.isArray(attempts) &&
    attempts.some(
      item =>
        item !== null &&
        typeof item === 'object' &&
        'questionIds' in item &&
        Array.isArray(item.questionIds) &&
        item.questionIds.includes(questionId)
    )
  ) {
    throw new Error(
      'Bu soru bir değerlendirmede kullanıldığı için silinemez.'
    )
  }

  saveAssessmentQuestions(
    questions.filter(item => item.id !== questionId)
  )
}

export function getQuestionsByTopic(
  grade: number,
  topicId: string
): AssessmentQuestion[] {
  return loadAssessmentQuestions().filter(
    item =>
      item.grade === grade &&
      item.topicId === topicId
  )
}

export function isLocalQuestion(
  questionId: string
): boolean {
  try {
    const raw = localStorage.getItem(
      'kimya-kocun-pwa-assessment-questions-v1'
    )

    const parsed: unknown = raw ? JSON.parse(raw) : []

    if (!Array.isArray(parsed)) {
      return false
    }

    return parsed.some(
      item =>
        item !== null &&
        typeof item === 'object' &&
        'id' in item &&
        item.id === questionId
    )
  } catch {
    return false
  }
}

export function getQuestionCount(
  grade: number,
  topicId: string
): number {
  return getQuestionsByTopic(grade, topicId).length
}

export function exportQuestionBankJSON(): string {
  const questions = loadAssessmentQuestions()

  return JSON.stringify(
    {
      version: 1,
      application: 'Kimya Koçun',
      exportedAt: new Date().toISOString(),
      questionCount: questions.length,
      questions,
    },
    null,
    2
  )
}

export function downloadQuestionBankJSON(): void {
  const json = exportQuestionBankJSON()

  const blob = new Blob([json], {
    type: 'application/json;charset=utf-8',
  })

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = 'kimya-kocun-pwa-soru-havuzu.json'

  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

