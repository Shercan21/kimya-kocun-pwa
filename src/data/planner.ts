// Kişisel çalışma programı oluşturucu (plan §2, §8, §9).
// Saf fonksiyonlar: ekrana bağlı değildir, girdiye göre öneri üretir.

import type { StudyTask } from './studyTasks'
import type { LearningStatus } from './learningProgress'
import { localDate } from './studyTasks'

export type PlannerTopic = {
  id: string
  grade: number
  title: string
  status: LearningStatus
  learnedAt: string | null
}

export type PlannedTask = {
  title: string
  date: string
  grade: number
  kind: 'study' | 'quiz' | 'review'
  topicId: string
  minutes: number
  reviewDue?: string
}

export type PlannerDay = {
  key: string // YYYY-MM-DD
  weekday: number // 0 = Pazartesi … 6 = Pazar
}

// Başlangıç tekrar aralıkları (gün). Plan gereği sabit değil;
// ileride öğrencinin performansına göre ayarlanacak.
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30]

export const KIND_MINUTES = { study: 30, quiz: 15, review: 10 } as const

export const KIND_LABEL = {
  study: 'konu çalışması',
  quiz: 'kazanım testi',
  review: 'tekrar',
  custom: 'görev',
} as const

const DEFAULT_TASK_MINUTES = 15

export function taskMinutes(task: StudyTask): number {
  return typeof task.minutes === 'number' && task.minutes > 0
    ? task.minutes
    : DEFAULT_TASK_MINUTES
}

export function weekDays(monday: Date): PlannerDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index, 12)
    return { key: localDate(day), weekday: index }
  })
}

export function mondayOf(offsetWeeks: number, now = new Date()): Date {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7) + offsetWeeks * 7)
  return day
}

function addDays(iso: string, days: number): string {
  const base = new Date(iso)
  const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, 12)
  return localDate(day)
}

type Options = {
  grades: number[]
  days: PlannerDay[]
  studyWeekdays: number[]
  dailyMinutes: number
  topics: PlannerTopic[]
  tasks: StudyTask[]
  today?: string
}

// Haftanın bugünden sonraki çalışma günlerine görev önerir.
// Geçmiş günlere ve mevcut görevlere dokunmaz.
export function planWeek({
  grades,
  days,
  studyWeekdays,
  dailyMinutes,
  topics,
  tasks,
  today = localDate(new Date()),
}: Options): PlannedTask[] {
  const studyDays = days.filter(
    day => studyWeekdays.includes(day.weekday) && day.key >= today
  )
  if (studyDays.length === 0) return []

  const gradeTasks = tasks.filter(task => task.grade !== undefined && grades.includes(task.grade))

  // Gün başına kalan süre
  const capacity = new Map<string, number>()
  for (const day of studyDays) {
    const used = gradeTasks
      .filter(task => task.date === day.key)
      .reduce((sum, task) => sum + taskMinutes(task), 0)
    capacity.set(day.key, Math.max(0, dailyMinutes - used))
  }

  const planned: PlannedTask[] = []

  const alreadyHas = (kind: PlannedTask['kind'], topicId: string, date?: string) =>
    gradeTasks.some(
      task =>
        task.kind === kind &&
        task.topicId === topicId &&
        (date ? task.date === date : !task.completed && task.date >= today)
    ) ||
    planned.some(
      item => item.kind === kind && item.topicId === topicId && (!date || item.date === date)
    )

  function place(day: PlannerDay, topic: PlannerTopic, kind: PlannedTask['kind'], reviewDue?: string) {
    const minutes = Math.min(KIND_MINUTES[kind], dailyMinutes)
    const left = capacity.get(day.key) ?? 0
    if (left < minutes) return false
    planned.push({
      title: `${topic.title} · ${KIND_LABEL[kind]}`,
      date: day.key,
      grade: topic.grade,
      kind,
      topicId: topic.id,
      minutes,
      ...(reviewDue ? {reviewDue} : {}),
    })
    capacity.set(day.key, Math.max(0, left - minutes))
    return true
  }

  // 1) Tekrarlar: öğrenildiği günden 1, 3, 7, 14, 30 gün sonra.
  //    Tekrar günü çalışma günü değilse haftanın sonraki çalışma gününe kayar.
  for (const topic of topics) {
    if (!topic.learnedAt || (topic.status !== 'learned' && topic.status !== 'permanent')) continue
    const learned = localDate(new Date(topic.learnedAt))
    for (const interval of REVIEW_INTERVALS) {
      const due = addDays(learned, interval)
      if (gradeTasks.some(task => task.kind === 'review' && task.topicId === topic.id && task.reviewDue === due)) continue
      const target = studyDays.find(day => day.key >= due &&
        !alreadyHas('review', topic.id, day.key) &&
        (capacity.get(day.key) ?? 0) >= Math.min(KIND_MINUTES.review, dailyMinutes))
      if (!target || due > days[days.length - 1].key) continue
      if (alreadyHas('review', topic.id, target.key)) continue
      place(target, topic, 'review', due)
    }
  }

  // 2) Çalışılmış ama sınavı yapılmamış konular için mini sınav.
  const quizTopics = topics.filter(topic => topic.status === 'studied' && !alreadyHas('quiz', topic.id))
  // 3) Henüz başlanmamış konular, sırayla.
  const newTopics = topics.filter(topic => topic.status === 'not_started' && !alreadyHas('study', topic.id))

  // Öğrenme yükü dengeli dağılsın diye günde en fazla bir yeni konu.
  for (const day of studyDays) {
    while (quizTopics.length && place(day, quizTopics[0], 'quiz')) quizTopics.shift()
    if (newTopics.length && place(day, newTopics[0], 'study')) newTopics.shift()
  }

  return planned.sort((a, b) => a.date.localeCompare(b.date))
}
