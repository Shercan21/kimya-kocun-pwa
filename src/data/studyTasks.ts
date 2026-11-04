
import { useSyncExternalStore } from 'react'

export type StudyTask = {
  id: string
  title: string
  completed: boolean
  date: string
  grade?: number
  // Program oluşturucunun eklediği görevlerde dolu olur.
  kind?: 'study' | 'quiz' | 'review' | 'custom'
  topicId?: string
  minutes?: number
  reviewDue?: string
}

const KEY = 'kimya-kocun-pwa-tasks-v2'
const DAILY_KEY = 'kimya-kocun-pwa-daily-tasks'
const WEEKLY_KEY = 'kimya-kocun-pwa-study-plan'

let cache: StudyTask[] | null = null
const listeners = new Set<() => void>()

function readArray(key: string): unknown[] {
  try {
    const value = localStorage.getItem(key)
    const parsed: unknown = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function validTask(value: unknown): value is StudyTask {
  if (!value || typeof value !== 'object') return false
  const task = value as Partial<StudyTask>
  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    typeof task.date === 'string' &&
    typeof task.completed === 'boolean' &&
    (task.grade === undefined ||
      typeof task.grade === 'number')
  )
}

function initialize(): StudyTask[] {
  if (cache !== null) return cache

  // Yeni kayıt mevcutsa eski kayıtları tekrar içe aktarma.
  if (localStorage.getItem(KEY) !== null) {
    cache = readArray(KEY).filter(validTask)
    return cache
  }

  const daily = readArray(DAILY_KEY).filter(validTask)
  const weekly = readArray(WEEKLY_KEY).filter(validTask)
  const merged: StudyTask[] = []
  const ids = new Set<string>()

  for (const task of [...daily, ...weekly]) {
    if (ids.has(task.id)) {
      // Aynı ID'li farklı kayıtların kaybolmasını önle.
      merged.push({ ...task, id: crypto.randomUUID() })
    } else {
      merged.push(task)
      ids.add(task.id)
    }
  }

  // Orijinal iki anahtara dokunulmaz.
  localStorage.setItem(KEY, JSON.stringify(merged))
  cache = merged
  return cache
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): StudyTask[] {
  return initialize()
}

export function useStudyTasks() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function updateStudyTasks(
  updater: (previous: StudyTask[]) => StudyTask[]
) {
  const next = updater(initialize())
  localStorage.setItem(KEY, JSON.stringify(next))
  cache = next
  listeners.forEach(listener => listener())
}

export function localDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
