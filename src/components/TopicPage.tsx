import { useEffect, useState } from 'react'
import Icon from './Icon'
import TestRunner from './TestRunner'
import ActivityRunner from './ActivityRunner'
import {
  etkinlikler,
  konuAnlatimi,
  ayrintiliAnlatim,
  konuBul,
  konuId,
  sinifMufredati,
  type EtkinlikKitabi,
} from '../data/content'
import { getTopicProgress, setTopicProgress } from '../data/learningProgress'
import { basari, testSonuclari } from '../data/results'

type Props = {
  grade: number
  kod: string
  initialTab?: TopicTab
  onBack: () => void
}

export type TopicTab = 'anlatim' | 'test' | 'etkinlik'
type Tab = TopicTab

type ActiveTest = { id: string; index: number; baslik: string }

const STATUS_LABEL = {
  not_started: 'Başlanmadı',
  studied: 'Çalışıldı',
  learned: 'Öğrenildi',
  permanent: 'Kalıcı öğrenildi',
} as const

function lastScore(grade: number, testId: string, seviye: string | null) {
  const results = testSonuclari(grade, testId, seviye)
  const last = results[results.length - 1]
  return last ? basari(last) : null
}

export default function TopicPage({ grade, kod, initialTab, onBack }: Props) {
  const found = konuBul(grade, kod)
  const mufredat = sinifMufredati(grade)
  const [tab, setTab] = useState<Tab>(initialTab ?? 'anlatim')
  const [html, setHtml] = useState<string | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [detailError, setDetailError] = useState('')
  const [reading, setReading] = useState<'detail' | 'summary'>('detail')
  const [kit, setKit] = useState<EtkinlikKitabi | null>(null)
  const [error, setError] = useState('')
  const [activeTest, setActiveTest] = useState<ActiveTest | null>(null)
  const [, refresh] = useState(0)

  useEffect(() => {
    let active = true
    if (tab === 'anlatim' && detail === null && !detailError) {
      ayrintiliAnlatim(grade, kod).then(text => active && setDetail(text)).catch(() => active && setDetailError('Bu konu için ayrıntılı anlatım yüklenemedi. Kısa özeti kullanabilir veya yeniden deneyebilirsin.'))
    }
    if (tab === 'anlatim' && found?.konu.anlatim && html === null) {
      konuAnlatimi(grade, kod)
        .then(text => active && setHtml(text))
        .catch(() => active && setError('Konu anlatımı yüklenemedi.'))
    }
    if (tab === 'etkinlik' && found?.konu.etkinlik && kit === null) {
      etkinlikler(grade, kod)
        .then(data => active && setKit(data))
        .catch(() => active && setError('Etkinlikler yüklenemedi.'))
    }
    return () => {
      active = false
    }
  }, [tab, grade, kod, found, html, kit, detail, detailError])

  if (!found || !mufredat) {
    return (
      <section className="card">
        <p className="muted">Konu bulunamadı.</p>
        <button type="button" className="btn-secondary" onClick={onBack}>Derslerime dön</button>
      </section>
    )
  }

  const { konu, bolum, tema } = found
  const topicId = konuId(grade, kod)
  const status = getTopicProgress(grade, topicId)?.status ?? 'not_started'

  if (activeTest) {
    return (
      <TestRunner
        grade={grade}
        testId={activeTest.id}
        testIndex={activeTest.index}
        konuKod={kod}
        konuBaslik={konu.ad}
        baslik={activeTest.baslik}
        onClose={() => {
          setActiveTest(null)
          refresh(value => value + 1)
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }

  return (
    <div className="stack">
      <section className="card topic-head">
        <button type="button" className="back-link" onClick={onBack}>‹ {bolum.ad}</button>
        <small>{grade}. sınıf · {tema.no}. tema {tema.ad} · {konu.kod}</small>
        <h2>{konu.ad}</h2>
        <span className={`status-chip status-${status}`}>{STATUS_LABEL[status]}</span>
        {konu.kazanimlar.length > 0 && (
          <ul className="kazanim-list">
            {konu.kazanimlar.map(code => (
              <li key={code}>
                <b>{code}</b> {mufredat.kazanimlar[code]}
              </li>
            ))}
          </ul>
        )}
        <div className="tabs" role="tablist">
          {([
            ['anlatim', 'Anlatım', konu.anlatim],
            ['test', `Testler (${konu.seviyeler.length + konu.baglam.length})`, true],
            ['etkinlik', `Etkinlikler (${konu.etkinlik})`, konu.etkinlik > 0],
          ] as const).map(([id, label, enabled]) =>
            enabled ? (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'tab-btn is-active' : 'tab-btn'}
                onClick={() => { setTab(id); setError('') }}
              >
                {label}
              </button>
            ) : null
          )}
        </div>
      </section>

      {error && <p className="program-message">{error}</p>}

      {tab === 'anlatim' && (
        <section className="card">
          <div className="reading-picker" role="group" aria-label="Anlatım türü">
            <button className={reading === 'detail' ? 'chip is-active' : 'chip'} aria-pressed={reading === 'detail'} onClick={() => setReading('detail')}>Ayrıntılı ve şekilli anlatım</button>
            <button className={reading === 'summary' ? 'chip is-active' : 'chip'} aria-pressed={reading === 'summary'} onClick={() => setReading('summary')}>Kısa özet</button>
          </div>
          {reading === 'detail' && detailError && <div role="alert"><p className="form-error">{detailError}</p><button className="btn-secondary" onClick={() => setDetailError('')}>Yeniden dene</button></div>}
          {(reading === 'detail' ? detail : html) === null ? (
            <p className="muted">Yükleniyor…</p>
          ) : (
            <>
              <div className="konu" dangerouslySetInnerHTML={{ __html: (reading === 'detail' ? detail : html) ?? '' }} />
              <div className="row-actions start">
                {status === 'not_started' ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setTopicProgress(grade, topicId, konu.ad, 'studied')
                      refresh(value => value + 1)
                    }}
                  >
                    <Icon name="check" size={16} /> Konuyu çalıştım
                  </button>
                ) : null}
                <button type="button" className="primary-button" onClick={() => { setTab('test'); window.scrollTo({ top: 0 }) }}>
                  Testlere geç ›
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'test' && (
        <section className="card">
          <h3 className="card-title">Kazanım testleri</h3>
          <ul className="test-list">
            {konu.seviyeler.map((seviye, index) => {
              const score = lastScore(grade, konu.test, seviye)
              return (
                <li key={`${konu.test}-${index}`}>
                  <span className={`level level-${(seviye ?? '').toLowerCase()}`}>{seviye}</span>
                  <span className="test-title">
                    {seviye} test
                    {score !== null && <small>Son sonuç: %{score}</small>}
                  </span>
                  <button
                    type="button"
                    className={score === null ? 'primary-button' : 'btn-secondary'}
                    onClick={() => setActiveTest({ id: konu.test, index, baslik: `${konu.ad} · ${seviye}` })}
                  >
                    {score === null ? 'Başla' : 'Tekrar çöz'}
                  </button>
                </li>
              )
            })}
          </ul>

          {konu.baglam.length > 0 && (
            <>
              <h3 className="card-title">Bağlam temelli testler</h3>
              <ul className="test-list">
                {konu.baglam.map(test => {
                  const score = lastScore(grade, test.id, null)
                  return (
                    <li key={test.id}>
                      <span className="level level-baglam">Bağlam</span>
                      <span className="test-title">
                        {test.baslik}
                        <small>
                          {test.kazanim} · {test.soru} soru
                          {score !== null && ` · Son sonuç: %${score}`}
                        </small>
                      </span>
                      <button
                        type="button"
                        className={score === null ? 'primary-button' : 'btn-secondary'}
                        onClick={() => setActiveTest({ id: test.id, index: 0, baslik: test.baslik })}
                      >
                        {score === null ? 'Başla' : 'Tekrar çöz'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          <p className="muted small">
            Bir testte %70 ve üzeri yaparsan konu "öğrenildi" olur. Bir hafta sonra
            yine başarılı olursan "kalıcı öğrenildi"ye geçer.
          </p>
        </section>
      )}

      {tab === 'etkinlik' && (
        kit === null ? (
          <section className="card"><p className="muted">Yükleniyor…</p></section>
        ) : (
          kit.etkinlikler.map(item => <ActivityRunner key={item.no} etkinlik={item} grade={grade} kod={kod} />)
        )
      )}
    </div>
  )
}
