import { useState } from 'react'
import Icon from './Icon'
import DailyTasks from './DailyTasks'
import { konuId, tumKonular } from '../data/content'
import { getTopicProgress } from '../data/learningProgress'
import { kilitliKonular } from '../data/locks'
import { useHataDefteri } from '../data/mistakes'
import { localDate, useStudyTasks } from '../data/studyTasks'
import { basari, sonuclariYukle } from '../data/results'
import type { TopicTab } from './TopicPage'

type Props = {
  selectedGrade: number | null; grades: number[]; gradeLabel?: string
  studentGoal: string; onGoalChange: (goal: string) => void
  onOpenLessons: () => void; onOpenMistakes: () => void; onOpenProgram: () => void
  onOpenTopic: (grade: number, topicId: string, tab?: TopicTab) => void
  knownTopics: Set<string>
}
export default function TodayPage({ selectedGrade, grades, gradeLabel, studentGoal, onGoalChange, onOpenLessons, onOpenMistakes, onOpenProgram, onOpenTopic, knownTopics }: Props) {
  const [editing, setEditing] = useState(false)
  const tasks = useStudyTasks()
  const now = new Date()
  const today = localDate(now)
  const topics = grades.flatMap(grade => tumKonular(grade).map(({ konu }) => ({ ...konu, grade, id: konuId(grade, konu.kod) })))
  const locked = kilitliKonular(grades, knownTopics)
  const progress = topics.map(t => ({ ...t, progress: getTopicProgress(t.grade, t.id) }))
  const learned = progress.filter(t => ['learned', 'permanent'].includes(t.progress?.status ?? '')).length
  const due = progress.find(t => t.progress?.status === 'learned' && t.progress.learnedAt && now.getTime() - new Date(t.progress.learnedAt).getTime() >= 7 * 86400000)
  const next = due ?? progress.find(t => t.progress?.status === 'studied' && !locked.has(t.grade + '|' + t.kod)) ?? progress.find(t => !t.progress && !locked.has(t.grade + '|' + t.kod) && !knownTopics.has(t.grade + '|' + t.kod))
  const errors = useHataDefteri().filter(h => h.durum === 'acik' && grades.includes(h.grade)).length
  const visibleTasks = tasks.filter(t => t.date === today && (t.grade === undefined || grades.includes(t.grade)))
  const done = visibleTasks.filter(t => t.completed).length
  const results = sonuclariYukle().filter(r => grades.includes(r.grade))
  const recent = results.slice(-5)
  const average = recent.length ? Math.round(recent.reduce((s,r) => s + basari(r), 0) / recent.length) : null
  const rate = topics.length ? Math.round(learned / topics.length * 100) : 0
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'Merhaba' : 'İyi akşamlar'
  const isTest = !!due || next?.progress?.status === 'studied'
  return <div className="student-home">
    <header className="student-heading">
      <div><span className="eyebrow">KÜÇÜK ADIMLAR, KALICI ÖĞRENME</span><h1>{greeting}, bugün kimya zamanı.</h1><p>{now.toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long' })} <span>·</span> {gradeLabel ?? selectedGrade + '. sınıf'}</p></div>
      <span className="student-edition"><Icon name="flask" /> Kendi hızında ilerle</span>
    </header>
    <div className="student-metrics">
      <div><span className="metric-icon purple"><Icon name="book" /></span><div><small>Öğrendiğin konu</small><b>{learned}<em> / {topics.length}</em></b></div></div>
      <div><span className="metric-icon teal"><Icon name="check" /></span><div><small>Bugünkü görevler</small><b>{done}<em> / {visibleTasks.length}</em></b></div></div>
      <div><span className="metric-icon amber"><Icon name="chart" /></span><div><small>Son 5 test ortalaması</small><b>{average === null ? '—' : '%' + average}</b></div></div>
      <div><span className="metric-icon coral"><Icon name="notebook" /></span><div><small>Üzerinde çalışılacak hata</small><b>{errors}</b></div></div>
    </div>
    <div className="student-dashboard">
      <div className="student-main-column">
        <section className="study-hero">
          <div className="hero-copy"><span className="hero-kicker"><span /> {due ? 'TEKRAR ZAMANI' : 'SANA ÖNERİLEN SONRAKİ ADIM'}</span>
            <h2>{next ? next.ad : 'Bugünkü yolunu sen seç.'}</h2>
            <p>{due ? 'Bir hafta önce öğrendiklerini yeniden ölç. %70 ve üzeri başarıyla bu konuyu kalıcı öğrenmeye taşı.' : isTest ? 'Konuyu çalıştın. Şimdi bir kazanım testi çözerek öğrendiklerini kontrol et.' : 'Önce anlatımı keşfet, örnekleri kendin çöz. Hazır olduğunda testlerle kendini dene.'}</p>
            <div className="hero-actions"><button className="primary-button" onClick={() => next ? onOpenTopic(next.grade, next.id, isTest ? 'test' : 'anlatim') : onOpenLessons()}><Icon name="play" size={18} />{isTest ? 'Teste devam et' : 'Çalışmaya başla'} <span>→</span></button><button className="hero-secondary" onClick={onOpenProgram}>Planımı gör</button></div>
          </div>
          <div className="chemistry-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="atom-core">K<span>Kimya</span></div><i className="electron e-one"/><i className="electron e-two"/><i className="electron e-three"/><span className="art-label">merak et · keşfet · öğren</span></div>
        </section>
        <section className="learning-route"><div><span className="route-number">01</span><b>Konuyu keşfet</b><small>Anlatım ve örnekler</small></div><span className="route-arrow">→</span><div><span className="route-number">02</span><b>Kendini dene</b><small>Test ve etkinlikler</small></div><span className="route-arrow">→</span><div><span className="route-number">03</span><b>Kalıcı hâle getir</b><small>Yanlışlar ve tekrar</small></div></section>
        <DailyTasks selectedGrade={selectedGrade} grades={grades} onOpenTopic={onOpenTopic} />
      </div>
      <aside className="student-side-column">
        <section className="card journey-card"><span className="eyebrow">ÖĞRENME YOLCULUĞUN</span><h3>Her konu bir adım.</h3><div className="journey-ring" style={{ '--progress': rate + '%' } as React.CSSProperties}><div><b>%{rate}</b><small>konu öğrenildi</small></div></div><p>{learned ? learned + ' konuyu öğrendin. Düzenli tekrarlarla bilgini güçlendir.' : 'İlk konuyla başla. İlerlemen burada adım adım büyüyecek.'}</p><button className="text-action" onClick={onOpenLessons}>Konu haritamı aç <span>→</span></button></section>
        <section className="card reflection-card"><span className="eyebrow">YANLIŞLARIN YOL GÖSTERİR</span><h3>{errors ? errors + ' soru seni bekliyor' : 'Hata yapmak öğrenmenin parçası.'}</h3><p>{errors ? 'Yeni sorulardan önce bu sorulara bir şans daha ver. Hatanın nedenini bulmak, çözümün ilk adımı.' : 'Testlerde yanlış veya boş bıraktığın sorular hata defterinde toplanır.'}</p><button className="btn-secondary" onClick={onOpenMistakes}>Hata defterime git <span>→</span></button></section>
        <section className="card personal-goal"><span className="eyebrow">BENİM HEDEFİM</span>{editing ? <form onSubmit={e => {e.preventDefault();setEditing(false)}}><label htmlFor="student-goal">Hedefini yaz</label><input id="student-goal" value={studentGoal} onChange={e => onGoalChange(e.target.value)} maxLength={160}/><button className="btn-secondary">Kaydet</button></form> : <><p>{studentGoal || 'Kendine küçük, ulaşılabilir bir hedef koy.'}</p><button className="text-action" onClick={() => setEditing(true)}>{studentGoal ? 'Hedefimi düzenle' : 'Hedefimi belirle'} <Icon name="pencil" size={15}/></button></>}</section>
      </aside>
    </div>
  </div>
}
