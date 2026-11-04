import publishedQuestionBank from './questionBankData.json'
export type AssessmentQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'open_ended'

export type AssessmentQuestion = {
  id: string
  grade: number
  topicId: string
  type: AssessmentQuestionType
  question: string
  choices?: Record<string, string>
  correctAnswer?: string
  explanation?: string
  maxPoints: number

  // Pekiştirme sorusunun bağlı olduğu ana soru
  relatedQuestionId?: string
}

export type AssessmentAnswer = {
  questionId: string
  studentAnswer: string
  earnedPoints: number | null
  isCorrect: boolean | null
  feedback: string | null
}

export type AssessmentPurpose =
  | 'initial'
  | 'learning'
  | 'retention'
  | 'remedial'

export type AssessmentStatus =
  | 'in_progress'
  | 'pending_review'
  | 'completed'

export type AssessmentAttempt = {
  id: string
  grade: number
  topicId: string
  topicTitle: string
  purpose: AssessmentPurpose
  remedialStage?: number
  questionIds: string[]
  answers: AssessmentAnswer[]
  status: AssessmentStatus
  totalPoints: number | null
  earnedPoints: number | null
  successRate: number | null
  passed: boolean | null
  startedAt: string
  completedAt: string | null
}

const QUESTIONS_KEY =
  'kimya-kocun-pwa-assessment-questions-v1'

const ATTEMPTS_KEY =
  'kimya-kocun-pwa-assessment-attempts-v1'

function readArray(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isQuestion(
  value: unknown
): value is AssessmentQuestion {
  if (!value || typeof value !== 'object') return false

  const item = value as Partial<AssessmentQuestion>

  return (
    typeof item.id === 'string' &&
    typeof item.grade === 'number' &&
    typeof item.topicId === 'string' &&
    typeof item.question === 'string' &&
    typeof item.maxPoints === 'number' &&
    item.maxPoints > 0 &&
    Number.isFinite(item.maxPoints) &&
    (
      item.type === 'multiple_choice' ||
      item.type === 'true_false' ||
      item.type === 'short_answer' ||
      item.type === 'open_ended'
    )
  )
}

function isAttempt(
  value: unknown
): value is AssessmentAttempt {
  if (!value || typeof value !== 'object') return false

  const item = value as Partial<AssessmentAttempt>

  return (
    typeof item.id === 'string' &&
    typeof item.grade === 'number' &&
    typeof item.topicId === 'string' &&
    typeof item.topicTitle === 'string' &&
    Array.isArray(item.questionIds) &&
    Array.isArray(item.answers) &&
    (
      item.purpose === 'initial' ||
      item.purpose === 'learning' ||
      item.purpose === 'retention' ||
      item.purpose === 'remedial'
    ) &&
    (
      item.status === 'in_progress' ||
      item.status === 'pending_review' ||
      item.status === 'completed'
    )
  )
}


export function loadAssessmentQuestions():
  AssessmentQuestion[] {
  const localQuestions =
    readArray(QUESTIONS_KEY).filter(isQuestion)

  const publishedQuestions: AssessmentQuestion[] =
  Array.isArray(publishedQuestionBank.questions)
    ? (publishedQuestionBank.questions as unknown[]).filter(isQuestion)
    : []

  const merged = new Map<string, AssessmentQuestion>()

  // Önce yayımlanmış JSON sorularını yükle.
  for (const question of publishedQuestions) {
    merged.set(question.id, question)
  }

  // Aynı ID varsa mevcut yerel kaydı koru.
  for (const question of localQuestions) {
    merged.set(question.id, question)
  }

  return [...merged.values()]
}


export function loadAssessmentAttempts():
  AssessmentAttempt[] {
  return readArray(ATTEMPTS_KEY).filter(isAttempt)
}

export function saveAssessmentQuestions(
  questions: AssessmentQuestion[]
): void {
  localStorage.setItem(
    QUESTIONS_KEY,
    JSON.stringify(questions)
  )
}

export function getTopicQuestions(
  grade: number,
  topicId: string
): AssessmentQuestion[] {
  return loadAssessmentQuestions().filter(
    question =>
      question.grade === grade &&
      question.topicId === topicId
  )
}

export function getTopicAttempts(
  grade: number,
  topicId: string
): AssessmentAttempt[] {
  return loadAssessmentAttempts().filter(
    attempt =>
      attempt.grade === grade &&
      attempt.topicId === topicId
  )
}

export function startAssessment(
  grade: number,
  topicId: string,
  topicTitle: string,
  purpose: AssessmentPurpose,
  questionIds: string[],
  remedialStage?: number
): AssessmentAttempt {
  if (questionIds.length === 0) {
    throw new Error(
      'Değerlendirme için en az bir soru gerekli.'
    )
  }

  const questions = loadAssessmentQuestions()

  const uniqueIds = [...new Set(questionIds)]

  const valid = uniqueIds.every(id =>
    questions.some(question =>
      question.id === id &&
      question.grade === grade &&
      question.topicId === topicId
    )
  )

  if (!valid) {
    throw new Error(
      'Seçilen sorular konu veya sınıfla eşleşmiyor.'
    )
  }

  const attempt: AssessmentAttempt = {
    id: crypto.randomUUID(),
    grade,
    topicId,
    topicTitle,
    purpose,
    ...(purpose === 'remedial' && remedialStage ? { remedialStage } : {}),
    questionIds: uniqueIds,
    answers: [],
    status: 'in_progress',
    totalPoints: null,
    earnedPoints: null,
    successRate: null,
    passed: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  }

  const attempts = loadAssessmentAttempts()

  localStorage.setItem(
    ATTEMPTS_KEY,
    JSON.stringify([...attempts, attempt])
  )

  return attempt
}

export function saveAssessmentAnswer(
  attemptId: string,
  questionId: string,
  studentAnswer: string
): AssessmentAttempt {
  const attempts = loadAssessmentAttempts()
  const index = attempts.findIndex(
    attempt => attempt.id === attemptId
  )

  if (index === -1) {
    throw new Error('Değerlendirme bulunamadı.')
  }

  const attempt = attempts[index]

  if (attempt.status !== 'in_progress') {
    throw new Error(
      'Bu değerlendirmede cevap değiştirilemez.'
    )
  }

  if (!attempt.questionIds.includes(questionId)) {
    throw new Error(
      'Soru bu değerlendirmeye ait değil.'
    )
  }

  const answer: AssessmentAnswer = {
    questionId,
    studentAnswer,
    earnedPoints: null,
    isCorrect: null,
    feedback: null,
  }

  const updated: AssessmentAttempt = {
    ...attempt,
    answers: [
      ...attempt.answers.filter(
        item => item.questionId !== questionId
      ),
      answer,
    ],
  }

  attempts[index] = updated

  localStorage.setItem(
    ATTEMPTS_KEY,
    JSON.stringify(attempts)
  )

  return updated
}


export function submitAssessment(
  attemptId: string
): AssessmentAttempt {
  const attempts = loadAssessmentAttempts()
  const index = attempts.findIndex(
    attempt => attempt.id === attemptId
  )

  if (index === -1) {
    throw new Error('Değerlendirme bulunamadı.')
  }

  const attempt = attempts[index]

  if (attempt.status !== 'in_progress') {
    throw new Error('Değerlendirme zaten gönderilmiş.')
  }

  const allAnswered = attempt.questionIds.every(id =>
    attempt.answers.some(answer =>
      answer.questionId === id &&
      answer.studentAnswer.trim().length > 0
    )
  )

  if (!allAnswered) {
    throw new Error(
      'Değerlendirmeyi göndermeden önce tüm soruları cevapla.'
    )
  }

  const questions = loadAssessmentQuestions()

  const selectedQuestions = attempt.questionIds.map(id =>
    questions.find(question => question.id === id)
  )

  if (selectedQuestions.some(question => !question)) {
    throw new Error(
      'Değerlendirmeye ait bazı sorular bulunamadı.'
    )
  }

  const canAutoGrade = selectedQuestions.every(
    question =>
      question !== undefined &&
      (
        question.type === 'multiple_choice' ||
        question.type === 'true_false'
      ) &&
      typeof question.correctAnswer === 'string' &&
      question.correctAnswer.trim().length > 0
  )

  if (!canAutoGrade) {
    const pending: AssessmentAttempt = {
      ...attempt,
      status: 'pending_review',
    }

    attempts[index] = pending

    localStorage.setItem(
      ATTEMPTS_KEY,
      JSON.stringify(attempts)
    )

    return pending
  }

  const gradedAnswers: AssessmentAnswer[] =
    attempt.answers.map(answer => {
      const question = selectedQuestions.find(
        item => item?.id === answer.questionId
      )!

      const isCorrect =
        answer.studentAnswer.trim() ===
        question.correctAnswer?.trim()

      return {
        ...answer,
        isCorrect,
        earnedPoints: isCorrect
          ? question.maxPoints
          : 0,
        feedback: isCorrect
          ? 'Doğru cevap.'
          : `Yanlış cevap. Doğru cevap: ${question.correctAnswer}`,
      }
    })

  const totalPoints = selectedQuestions.reduce(
    (sum, question) => sum + (question?.maxPoints ?? 0),
    0
  )

  const earnedPoints = gradedAnswers.reduce(
    (sum, answer) => sum + (answer.earnedPoints ?? 0),
    0
  )

  const successRate =
    totalPoints > 0
      ? Math.round((earnedPoints / totalPoints) * 100)
      : 0

  const updated: AssessmentAttempt = {
    ...attempt,
    answers: gradedAnswers,
    status: 'completed',
    totalPoints,
    earnedPoints,
    successRate,
    passed: successRate >= 70,
    completedAt: new Date().toISOString(),
  }

  attempts[index] = updated

  localStorage.setItem(
    ATTEMPTS_KEY,
    JSON.stringify(attempts)
  )

  return updated
}

export function getRemedialQuestions(
  grade: number,
  topicId: string,
  wrongQuestionIds: string[],
  limit = 3
): AssessmentQuestion[] {
  if (wrongQuestionIds.length === 0 || limit <= 0) {
    return []
  }

  const wrongIds = new Set(wrongQuestionIds)

  return getTopicQuestions(grade, topicId)
    .filter(question =>
      question.relatedQuestionId !== undefined &&
      wrongIds.has(question.relatedQuestionId) &&
      !wrongIds.has(question.id)
    )
    .slice(0, limit)
}

// Normal sınavlarda pekiştirme sorularını dışarıda tut.
export function getMainAssessmentQuestions(grade: number, topicId: string): AssessmentQuestion[] {
  return getTopicQuestions(grade, topicId).filter(q => !q.relatedQuestionId)
}

// Tamamlanmış ve devam eden bütün denemelerde kullanılmış sorular.
export function getUsedQuestionIds(grade: number, topicId: string): Set<string> {
  return new Set(getTopicAttempts(grade, topicId).flatMap(a => a.questionIds))
}

export function getFreshMainQuestions(grade: number, topicId: string, count = 5): AssessmentQuestion[] {
  const used = getUsedQuestionIds(grade, topicId)
  return getMainAssessmentQuestions(grade, topicId).filter(q => !used.has(q.id)).slice(0, count)
}

export function getFreshRemedialQuestions(
  grade: number,
  topicId: string,
  wrongQuestionIds: string[],
  count = 3
): AssessmentQuestion[] {
  const wrong = new Set(wrongQuestionIds)
  const used = getUsedQuestionIds(grade, topicId)
  return getTopicQuestions(grade, topicId)
    .filter(q => q.relatedQuestionId && wrong.has(q.relatedQuestionId) && !used.has(q.id))
    .slice(0, count)
}
