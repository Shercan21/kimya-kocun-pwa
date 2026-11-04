// Öğrenme durumu tek yerde tanımlı: learningProgress.ts
import type { LearningStatus } from './learningProgress'

export type { LearningStatus }

export interface LearningTask {
  id: string
  title: string
  grade: 9 | 10 | 11 | 12
  topicId?: string
  scheduledDate: string
  completed: boolean
  status: LearningStatus
}

export interface DailyLearningPlan {
  date: string
  tasks: LearningTask[]
}

export interface StudentLearningPlan {
  studentId: string
  grade: 9 | 10 | 11 | 12
  goal: string
  dailyPlans: DailyLearningPlan[]
}

export const learningPlans: StudentLearningPlan[] = []
