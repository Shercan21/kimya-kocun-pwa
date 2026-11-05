import type { Soru } from './content'

export type TestDraft = { answers: Record<number, number>; index: number; at: number; order?: number[]; fingerprint?: string }

export function questionFingerprint(questions: Soru[]): string {
  const text = JSON.stringify(questions)
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return questions.length + ':' + (hash >>> 0).toString(16)
}

export function shuffleOrder(count: number, random = Math.random, previous?: number[]): number[] {
  const order = Array.from({ length: count }, (_, i) => i)
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  if (count > 1 && previous?.every((value, i) => value === order[i])) {
    ;[order[0], order[1]] = [order[1], order[0]]
  }
  return order
}

export function prepareTestAttempt(questions: Soru[], draft: TestDraft | null, random = Math.random) {
  const fingerprint = questionFingerprint(questions)
  const fresh = () => ({ order: shuffleOrder(questions.length, random), answers: {} as Record<number, number>, index: 0, resumed: false, fingerprint })
  if (!draft || (draft.fingerprint && draft.fingerprint !== fingerprint)) return fresh()
  // Eski taslaklarda sorular kaynak sırasındaydı; mevcut cevapları o sırada tut.
  const order = draft.order ?? questions.map((_, i) => i)
  if (!Array.isArray(order) || order.length !== questions.length || new Set(order).size !== questions.length || order.some(i => !Number.isInteger(i) || i < 0 || i >= questions.length)) return fresh()
  const answers: Record<number, number> = {}
  for (const [position, answer] of Object.entries(draft.answers)) {
    const i = Number(position)
    if (Number.isInteger(i) && i >= 0 && i < order.length && Number.isInteger(answer) && answer >= 0 && answer < questions[order[i]].sik.length) answers[i] = answer
  }
  return { order: [...order], answers, index: Number.isInteger(draft.index) ? Math.max(0, Math.min(draft.index, Math.max(0, order.length - 1))) : 0, resumed: Object.keys(answers).length > 0, fingerprint }
}

export function canonicalAnswers(order: number[], answers: Record<number, number>): Record<number, number> {
  const canonical: Record<number, number> = {}
  order.forEach((sourceIndex, displayIndex) => { if (answers[displayIndex] !== undefined) canonical[sourceIndex] = answers[displayIndex] })
  return canonical
}
