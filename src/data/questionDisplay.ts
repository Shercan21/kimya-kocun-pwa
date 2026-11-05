import type { Soru } from './content'

export function tamGorselSoru(soru: Soru): boolean {
  if (!/<img\b/i.test(soru.s)) return false
  if (typeof soru.gorselTamSoru === 'boolean') return soru.gorselTamSoru
  return soru.sik.length >= 2 && soru.sik.every((sik, index) =>
    sik.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim().replace(/[).:]$/, '') === String.fromCharCode(65 + index))
}

export function soruGorunumHtml(soru: Soru): string {
  return tamGorselSoru(soru) ? (soru.s.match(/<img\b[^>]*>/gi) || []).join('') : soru.s
}
