import { useState } from 'react'
import Icon from './Icon'
import SignInButton from './SignInButton'
import { PrivacyLink } from './Privacy'
import { cikisYap, hesabiSil, syncNow, useCloud } from '../data/cloud'

function zaman(iso: string | null) {
  if (!iso) return 'henüz yedeklenmedi'
  const d = new Date(iso)
  const dk = Math.round((Date.now() - d.getTime()) / 60000)
  if (dk < 1) return 'az önce yedeklendi'
  if (dk < 60) return `${dk} dk önce yedeklendi`
  return `${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} yedeklendi`
}

export default function AccountCard() {
  const cloud = useCloud()
  const [silme, setSilme] = useState(false)
  const [cihaz, setCihaz] = useState(false)
  const [siliniyor, setSiliniyor] = useState(false)

  if (!cloud.ready) return null

  if (!cloud.user) {
    return (
      <section className="card account-card">
        <h3 className="card-title">
          <Icon name="cloud" />
          Hesabım
        </h3>
        <p className="muted">
          Google ile giriş yaparsan ilerlemen kendi Google Drive'ına yedeklenir; telefonunu değiştirsen de kaldığın yerden devam edersin. Yedek hesabının uygulamaya ayrılan alanında tutulur. Paylaşılan cihazlarda işin bitince çıkış yap.
        </p>
        {cloud.error && <p className="form-error">{cloud.error}</p>}
        <SignInButton />
        <p className="small"><PrivacyLink /></p>
      </section>
    )
  }

  const user = cloud.user
  return (
    <section className="card account-card">
      <h3 className="card-title">
        <Icon name="cloud" />
        Hesabım
      </h3>
      <div className="account-row">
        {user.photoURL ? (
          <img className="account-photo" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="account-photo">{(user.displayName ?? '?').slice(0, 1)}</span>
        )}
        <div>
          <b>{user.displayName}</b>
          <small className="muted">{user.email}</small>
        </div>
      </div>
      <p className="small local-save-note">İlerlemen bu cihazda saklanıyor. Son başarılı Drive kontrolü aşağıda; güncel yedek için Şimdi yedekle’ye bas.</p>
      <p className="muted small">
        {cloud.syncing ? 'Yedekleniyor…' : `Google Drive'ına ${zaman(cloud.lastSync)}`}
      </p>
      {cloud.error && <p className="form-error">{cloud.error}</p>}
      <div className="row-actions start">
        <button type="button" className="btn-secondary" onClick={() => syncNow(true)}>
          Şimdi yedekle
        </button>
        <button type="button" className="btn-ghost" onClick={() => cikisYap()}>
          Çıkış yap
        </button>
      </div>
      <p className="small account-links">
        <PrivacyLink />
        {!silme && (
          <button type="button" className="link-button danger" onClick={() => setSilme(true)}>
            Yedeğimi sil ve hesaptan çık
          </button>
        )}
      </p>
      {silme && (
        <div className="delete-box" role="alert">
          <b>Drive'daki yedeğin silinecek.</b>
          <p className="small">Google Drive'ındaki yedeğin silinir ve uygulamanın Drive iznini geri alırız. Bu işlem geri alınamaz.</p>
          <label className="consent">
            <input type="checkbox" checked={cihaz} onChange={e => setCihaz(e.target.checked)} />
            <span>Bu cihazdaki ilerlemem de silinsin</span>
          </label>
          <div className="row-actions start">
            <button type="button" className="btn-secondary" onClick={() => setSilme(false)}>Vazgeç</button>
            <button
              type="button"
              className="danger-button"
              disabled={siliniyor}
              onClick={async () => {
                setSiliniyor(true)
                try {
                  await hesabiSil(cihaz)
                  if (cihaz) window.location.reload()
                } finally {
                  setSiliniyor(false)
                  setSilme(false)
                }
              }}
            >
              {siliniyor ? 'Siliniyor…' : 'Evet, sil'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4C12.9 4 4 12.9 4 24s8.9 20 20 20s20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4C16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
