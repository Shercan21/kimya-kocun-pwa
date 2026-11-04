import { useEffect, useState } from 'react'
import { useBackStep } from '../data/backNav'
import { TEACHER_EMAIL } from '../data/cloud'
import { kvkkOnayla } from '../data/kvkk'

export function AydinlatmaMetni() {
  return (
    <div className="privacy-text">
      <p className="muted small">Son güncelleme: 3 Kasım 2026</p>

      <h4>Kısaca</h4>
      <ul>
        <li>Kimya Koçun'un bir sunucusu ya da veritabanı yok. Çalışma bilgilerin <b>yalnızca kendi cihazında</b> tutulur.</li>
        <li><b>Google ile giriş yaparsan</b> bu bilgilerin yedeği <b>senin kendi Google Drive'ına</b>, uygulamaya ayrılmış gizli bir klasöre kaydedilir. Böylece telefon değiştirsen de kaldığın yerden devam edersin.</li>
        <li>Yedeğini <b>öğretmen dahil kimse göremez</b>; uygulama yalnızca kendi klasörüne erişebilir, Drive'ındaki diğer dosyalarını göremez.</li>
        <li>Reklam yok, bilgilerin satılmaz ve kimseyle paylaşılmaz.</li>
        <li>Yedeğini istediğin zaman uygulamadan silebilirsin.</li>
      </ul>

      <h4>Uygulamayı hazırlayan</h4>
      <p>
        Kimya öğretmeni Hasan. Soruların ve önerilerin için:{' '}
        <a href={`mailto:${TEACHER_EMAIL}`}>{TEACHER_EMAIL}</a>
      </p>

      <h4>Hangi bilgiler kullanılır?</h4>
      <ul>
        <li><b>Google hesabından:</b> adın, e-posta adresin ve profil fotoğrafın — yalnızca "kimin hesabıyla giriş yapıldığını" göstermek için, yalnızca senin cihazında.</li>
        <li><b>Uygulama içinden:</b> sınıfın, çalışma amacın ve düzenin, test ve etkinlik sonuçların, hata defterin, tarama sonucun ve konuların öğrenme durumu. Raporlar ve koçun önerileri bu bilgilerle senin cihazında hesaplanır.</li>
      </ul>
      <p>Kimlik numarası, telefon, adres, sağlık bilgisi gibi bilgiler istenmez.</p>
      <p>
        <b>Anonim ziyaret sayacı:</b> Uygulamanın kaç kez ve hangi bölümlerinin açıldığını görmek için çerez kullanmayan
        GoatCounter sayacı kullanılır. Sayaca adın, e-postan, sonuçların ya da hesabınla ilgili hiçbir bilgi gönderilmez;
        yalnızca açılan bölümün adı (örneğin "Dersler") ve tarayıcının genel bilgileri sayılır. Kim olduğun bilinemez.
      </p>

      <h4>Nerede saklanır?</h4>
      <p>
        Cihazında (tarayıcının uygulama deposunda) ve giriş yaptıysan kendi Google Drive hesabında. Drive'daki yedek
        Google'ın sunucularındadır ve Google'ın kendi gizlilik kurallarına tabidir; Drive kotandan çok az yer kaplar.
        Uygulamanın kendisi hiçbir yerde senin bilgilerini toplamaz.
      </p>

      <h4>Ne zaman silinir?</h4>
      <p>
        "Yedeğimi sil ve hesaptan çık" ile Drive'daki yedeğin silinir ve uygulamanın Drive iznini geri alırız. İstersen
        cihazındaki bilgileri de aynı anda silebilirsin. Ayrıca Google hesabının Drive ayarlarından ("Uygulamaları
        yönet") da yedeği silebilirsin.
      </p>

      <h4>18 yaşından küçüksen</h4>
      <p>
        Google ile giriş yapmadan önce bu metni velinle birlikte oku ve onun onayını al. Giriş yapmadan da bütün
        özellikleri kullanabilirsin; yalnızca yedekleme olmaz.
      </p>

      <h4>Hakların</h4>
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 11. maddesindeki haklarına ilişkin sorularını yukarıdaki
        e-posta adresine yazabilirsin. Bilgilerin uygulamanın elinde değil, kendi cihazında ve kendi Drive'ında
        durduğu için onları her zaman kendin silebilirsin.
      </p>
    </div>
  )
}

export function PrivacyModal({ onClose, children }: { onClose: () => void; children?: React.ReactNode }) {
  useBackStep(true, onClose)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Aydınlatma metni" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Gizlilik ve aydınlatma metni</h3>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Kapat">×</button>
        </div>
        <div className="modal-body">
          <AydinlatmaMetni />
        </div>
        {children && <div className="modal-foot">{children}</div>}
      </div>
    </div>
  )
}

export function PrivacyLink({ label = 'Gizlilik ve aydınlatma metni' }: { label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="link-button" onClick={() => setOpen(true)}>{label}</button>
      {open && <PrivacyModal onClose={() => setOpen(false)} />}
    </>
  )
}

// Google ile girişten önce ilk seferde aydınlatma metnini gösterip onay ister.
export function GirisOnayi({ onOnay, onClose }: { onOnay: () => void; onClose: () => void }) {
  const [onay, setOnay] = useState(false)
  return (
    <PrivacyModal onClose={onClose}>
      <label className="consent">
        <input type="checkbox" checked={onay} onChange={e => setOnay(e.target.checked)} />
        <span>
          Metni okudum. İlerlememin kendi Google Drive'ıma yedeklenmesine onay veriyorum. 18 yaşından küçüksem velimin
          de onayı var.
        </span>
      </label>
      <div className="row-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Vazgeç</button>
        <button
          type="button"
          className="primary-button"
          disabled={!onay}
          onClick={() => {
            kvkkOnayla()
            onOnay()
          }}
        >
          Onaylıyorum, giriş yap
        </button>
      </div>
    </PrivacyModal>
  )
}
