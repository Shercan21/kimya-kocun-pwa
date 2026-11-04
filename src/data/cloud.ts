// Hesap ve yedekleme durumunun hafif kısmı. Asıl işi yapan driveSync.ts,
// uygulama açıldıktan sonra arka planda yüklenir.
//
// Öğrencinin ilerlemesi yalnızca KENDİ Google Drive'ında, uygulamaya ayrılmış
// gizli klasörde (appDataFolder) saklanır. Öğretmen dahil kimse göremez;
// uygulamanın kendi sunucusu ya da veritabanı yoktur.

import { useSyncExternalStore } from 'react'

export const TEACHER_EMAIL = 'ercanseyithasan@gmail.com'
export const SYNC_KEY = 'kimya-kocun-pwa-sync' // { email, hash, at }
export const HESAP_KEY = 'kimya-kocun-pwa-hesap' // giriş yapan Google hesabının adı/e-postası (yalnız bu cihazda)

export type CloudUser = {
  email: string
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
}

export type CloudState = {
  ready: boolean
  user: CloudUser | null
  syncing: boolean
  lastSync: string | null
  error: string | null
}

type SyncInfo = { email: string; hash: string; at: string }

export function readSync(): SyncInfo | null {
  try {
    const raw = localStorage.getItem(SYNC_KEY)
    return raw ? (JSON.parse(raw) as SyncInfo) : null
  } catch {
    return null
  }
}

export function readHesap(): CloudUser | null {
  try {
    const raw = localStorage.getItem(HESAP_KEY)
    return raw ? (JSON.parse(raw) as CloudUser) : null
  } catch {
    return null
  }
}

let state: CloudState = {
  ready: true,
  user: readHesap(),
  syncing: false,
  lastSync: readSync()?.at ?? null,
  error: null,
}
const listeners = new Set<() => void>()

export function setState(patch: Partial<CloudState>) {
  state = { ...state, ...patch }
  listeners.forEach(fn => fn())
}

export function getState() {
  return state
}

export function useCloud() {
  return useSyncExternalStore(
    fn => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state
  )
}

export function isTeacher(user: CloudUser | null) {
  return !!user && user.email === TEACHER_EMAIL && user.emailVerified
}

const impl = () => import('./driveSync')

export function startCloud(onDataChanged: () => void) {
  const go = () => {
    impl()
      .then(m => m.start(onDataChanged))
      .catch(() => undefined)
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 2500 })
  else setTimeout(go, 800)
}

// Yedekle: oturum süresi dolduysa Google kısa bir pencereyle yeniler (dokunuşla çağrılmalı).
export async function syncNow(interactive = false) {
  if (!state.user) return
  return (await impl()).syncNow(interactive)
}

export async function googleIleGiris() {
  return (await impl()).googleIleGiris()
}

export async function cikisYap() {
  return (await impl()).cikisYap()
}

export async function hesabiSil(cihazdakiniDeSil: boolean) {
  return (await impl()).hesabiSil(cihazdakiniDeSil)
}
