import { useState } from 'react'
import Icon from './Icon'
import { KAYNAK_AD, kazanimRaporu, type Kaynak, type KazanimDurum, type KazanimSatiri } from '../data/kazanimRaporu'
import { useTaramaSonucu } from '../data/screening'

const BASLIK: Record<Exclude<KazanimDurum, 'yok'>, { ad: string; not: string; cls: string }> = {
  eksik: { ad: 'Eksik kazanımlar', not: 'Bu kazanımların konu anlatımına dön, sonra konu testini yeniden çöz.', cls: 'eksik' },
  tekrar: { ad: 'Tekrar etmen gerekenler', not: 'Temel var ama oturmamış. Etkinliklerle ve hata defterinle tekrar et.', cls: 'kismen' },
  iyi: { ad: 'İyi gidenler', not: 'Bu kazanımlarda başarın %70 ve üstü. Arada bir tekrar etmen yeterli.', cls: 'tamam' },
}

function Satir({ s }: { s: KazanimSatiri }) {
  return (
    <li className="kr-satir">
      <div>
        <b>{s.kod}</b> {s.ad}
        {s.konular.length > 0 && <small>Konu: {s.konular.map(k => `${k.kod} ${k.ad}`).join(' · ')}</small>}
        <small className="kr-kaynak">
          {(Object.keys(s.kaynaklar) as Kaynak[]).map(k => `${KAYNAK_AD[k]} %${s.kaynaklar[k]}`).join(' · ')}
        </small>
      </div>
      <span className={`tarama-etiket ${s.durum === 'iyi' ? 'tamam' : s.durum === 'tekrar' ? 'kismen' : 'eksik'}`}>%{s.oran}</span>
    </li>
  )
}

export default function KazanimRaporu({ grades }: { grades: number[] }) {
  const t1 = useTaramaSonucu(grades[0] ?? 0)
  const t2 = useTaramaSonucu(grades[1] ?? 0)
  const t3 = useTaramaSonucu(grades[2] ?? 0)
  const { satirlar, genel, turlar } = kazanimRaporu(grades, [t1, t2, t3])
  const [hepsi, setHepsi] = useState(false)

  const cozulen = satirlar.filter(s => s.durum !== 'yok')
  const grup = (d: Exclude<KazanimDurum, 'yok'>) => cozulen.filter(s => s.durum === d).sort((a, b) => (a.oran ?? 0) - (b.oran ?? 0))
  const yok = satirlar.length - cozulen.length
  const genelZayif = genel.filter(g => g.oran < 70)

  return (
    <section className="card kazanim-raporu">
      <h3 className="card-title">
        <Icon name="list" />
        Kazanım raporum
      </h3>

      {cozulen.length === 0 ? (
        <p className="muted">Test, sarmal, karma ve etkinlik çözdükçe hangi kazanımlarda iyi olduğun, hangilerini tekrar etmen gerektiği burada görünecek.</p>
      ) : (
        <>
          <div className="kr-turlar">
            {turlar.map(t => (
              <div key={t.kaynak} className={`kr-tur ${t.oran >= 70 ? 'tamam' : t.oran >= 40 ? 'kismen' : 'eksik'}`}>
                <small>{KAYNAK_AD[t.kaynak]}</small>
                <b>%{t.oran}</b>
              </div>
            ))}
          </div>
          <p className="muted small">
            {cozulen.length} kazanımda sonucun var{yok ? `, ${yok} kazanımda henüz soru çözmedin` : ''}.
          </p>
          {(['eksik', 'tekrar', 'iyi'] as const).map(d => {
            const list = grup(d)
            if (!list.length) return null
            const gosterilen = hepsi || d !== 'iyi' ? list : list.slice(0, 3)
            return (
              <div key={d} className={`kr-grup ${BASLIK[d].cls}`}>
                <h4>{BASLIK[d].ad} <span>({list.length})</span></h4>
                <p className="muted small">{BASLIK[d].not}</p>
                <ul>{gosterilen.map(s => <Satir key={`${s.grade}-${s.kod}`} s={s} />)}</ul>
                {d === 'iyi' && list.length > 3 && !hepsi && (
                  <button type="button" className="link-button" onClick={() => setHepsi(true)}>Hepsini göster</button>
                )}
              </div>
            )
          })}
        </>
      )}

      {genel.length > 0 && (
        <div className="kr-grup">
          <h4>Sarmal ve karma testler</h4>
          <p className="muted small">
            {genelZayif.length
              ? 'Bu testlerde %70 altında kaldıkların var; ilgili bölümü tekrar et, sonra testi yeniden çöz.'
              : 'Sarmal ve karma testlerde iyi gidiyorsun.'}
          </p>
          <ul>
            {genel.map(g => (
              <li key={`${g.grade}-${g.tur}-${g.baslik}`} className="kr-satir">
                <div>
                  {g.tur === 'sarmal' ? 'Sarmal' : ''} {g.baslik}
                  <small>{grades.length > 1 ? `${g.grade}. sınıf · ` : ''}{g.deneme} deneme · son sonuç</small>
                </div>
                <span className={`tarama-etiket ${g.oran >= 70 ? 'tamam' : g.oran >= 40 ? 'kismen' : 'eksik'}`}>%{g.oran}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
