import { useState } from 'react'
import { GoogleMark } from './AccountCard'
import { GirisOnayi } from './Privacy'
import { kvkkOnayliMi } from '../data/kvkk'
import { googleIleGiris } from '../data/cloud'

// İlk girişte aydınlatma metnini gösterip onay alır, sonra Google ile giriş yapar.
export default function SignInButton() {
  const [soruyor, setSoruyor] = useState(false)
  return (
    <>
      <button
        type="button"
        className="google-button"
        onClick={() => (kvkkOnayliMi() ? googleIleGiris() : setSoruyor(true))}
      >
        <GoogleMark />
        Google ile giriş yap
      </button>
      {soruyor && (
        <GirisOnayi
          onClose={() => setSoruyor(false)}
          onOnay={() => {
            setSoruyor(false)
            googleIleGiris()
          }}
        />
      )}
    </>
  )
}
