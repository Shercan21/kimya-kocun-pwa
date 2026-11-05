import { lazy, Suspense, useEffect, useState } from 'react'
import './App.css'
import './student.css'
import './student-polish.css'
import OfflineCard from './components/OfflineCard'
import LocalBackupCard from './components/LocalBackupCard'
import ResourceLibrary from './components/ResourceLibrary'
import Icon, { type IconName } from './components/Icon'
import TodayPage from './components/TodayPage'
import TopicMap from './components/TopicMap'
import CurriculumPage from './components/CurriculumPage'
import type { TopicTab } from './components/TopicPage'
import type { Eylem } from './data/coach'
import { useHataDefteri } from './data/mistakes'
import { konuBul, sinifMufredati, tumKonular } from './data/content'
import StudyTopics from './components/StudyTopics'
import LearningTracker from './components/LearningTracker'
import Onboarding from './components/Onboarding'
import AccountCard from './components/AccountCard'
import StudentPreviewCard from './components/StudentPreviewCard'
import KazanimRaporu from './components/KazanimRaporu'
import { isTeacher, syncNow, useCloud } from './data/cloud'
import { kilitliKonular } from './data/locks'
import { eksikKonular, useTaramaSonucu } from './data/screening'
import { sayfaSay } from './data/sayac'
import { useBackStep } from './data/backNav'
import { useYaziliKonulari } from './data/yaziliKazanim'
import {
  loadProfile,
  saveProfile,
  purposeTitle,
  profilSiniflari,
  profilEtiketi,
  SINAV_SINIFLARI,
  type StudentProfile,
  type StudyPurpose,
} from './data/profile'
import { loadTopics } from './data/topics'
import {
  getGradeLearningSummary,
  getTopicProgress,
} from './data/learningProgress'

// Sayfalar ilk açılışı hızlandırmak için ayrı parçalar halinde yüklenir.
const TopicPage = lazy(() => import('./components/TopicPage'))
const ProgramPage = lazy(() => import('./components/ProgramPage'))
const CoachPage = lazy(() => import('./components/CoachPage'))
const ExamsPage = lazy(() => import('./components/ExamsPage'))
const MistakeBook = lazy(() => import('./components/MistakeBook'))
const QuestionBankManager = lazy(() => import('./components/QuestionBankManager'))
const PracticePage = lazy(() => import('./components/PracticePage'))
const ScreeningPage = lazy(() => import('./components/ScreeningPage'))

type PageId = 'today' | 'coach' | 'program' | 'lessons' | 'exams' | 'practice' | 'screening' | 'progress'

const pages: { id: PageId; label: string; short: string; icon: IconName }[] = [
  { id: 'today', label: 'Bugün', short: 'Bugün', icon: 'home' },
  { id: 'coach', label: 'Koçum', short: 'Koç', icon: 'target' },
  { id: 'program', label: 'Programım', short: 'Program', icon: 'calendar' },
  { id: 'lessons', label: 'Derslerim', short: 'Dersler', icon: 'book' },
  { id: 'exams', label: 'Yazılı ve TYT/AYT', short: 'Sınav', icon: 'file' },
  { id: 'practice', label: 'Soru çöz', short: 'Soru çöz', icon: 'list' },
  { id: 'screening', label: 'Eksik taraması', short: 'Tarama', icon: 'target' },
  { id: 'progress', label: 'Gelişimim', short: 'Gelişim', icon: 'chart' },
]

// Amaca göre uygulamanın çalışma biçimi:
// - yazili: yalnızca yazılıya hazırlık ve yazılı senaryolarındaki konular
// - konu: konu listesi; seçilen konu (kazanımı) açılır, kilit yok
// - soru: sınıf/TYT-AYT → tema (sarmal) ya da genel (karma) test
// - tam: bütün sayfalar; konular sırayla açılır (öncekini tamamla)
type Mod = 'tam' | 'yazili' | 'konu' | 'soru' | 'eksik'

const MOD_SAYFALARI: Record<Mod, { id: PageId; label?: string; short?: string }[]> = {
  tam: [{ id: 'today' }, { id: 'coach' }, { id: 'program' }, { id: 'lessons' }, { id: 'exams' }, { id: 'progress' }],
  yazili: [
    { id: 'exams', label: 'Yazılıya hazırlık', short: 'Yazılı' },
    { id: 'lessons', label: 'Yazılı konuları', short: 'Konular' },
    { id: 'progress' },
  ],
  konu: [{ id: 'lessons', label: 'Konular', short: 'Konular' }, { id: 'coach' }, { id: 'progress' }],
  soru: [{ id: 'practice' }, { id: 'coach' }, { id: 'progress' }],
  eksik: [{ id: 'screening' }, { id: 'coach' }, { id: 'progress' }],
}

function modOf(purpose: StudyPurpose, grade: number, teacher: boolean): Mod {
  if (teacher) return 'tam'
  if (purpose === 'written_exam') return grade === 12 ? 'tam' : 'yazili'
  if (purpose === 'topic') return 'konu'
  if (purpose === 'practice') return 'soru'
  if (purpose === 'gaps') return 'eksik'
  return 'tam'
}


// İlk girişten sonra amaca göre açılacak sayfa.
const startPage: Record<StudyPurpose, PageId> = {
  long_term: 'program',
  school: 'today',
  written_exam: 'exams',
  tyt_ayt: 'program',
  topic: 'lessons',
  practice: 'practice',
  gaps: 'screening',
}

const PAGE_KEY = 'kimya-kocun-pwa-page'
const GOAL_KEY = 'kimya-kocun-pwa-goal'
const VIEW_KEY = 'kimya-kocun-pwa-ders-gorunum'
const TEACHER_GRADE_KEY = 'kimya-kocun-pwa-ogretmen-sinif'
const PREVIEW_KEY = 'kimya-kocun-pwa-onizleme'
const SECILI_KONU_KEY = 'kimya-kocun-pwa-secili-konu'
type Onizleme = { grade: number; purpose: StudyPurpose }
const ALL_GRADES = [9, 10, 11, 12] as const

function App() {
  const [page, setPage] = useState<PageId>(() => {
    const saved = localStorage.getItem(PAGE_KEY)
    return pages.some(item => item.id === saved) ? (saved as PageId) : 'today'
  })

  const [studentGoal, setStudentGoal] = useState<string>(
    () => localStorage.getItem(GOAL_KEY) || ''
  )

  const [storedProfile, setProfile] = useState<StudentProfile | null>(loadProfile)
  const [editingProfile, setEditingProfile] = useState(false)
  const [openTopic, setOpenTopic] = useState<{ grade: number; kod: string; tab?: TopicTab } | null>(null)
  const [mistakesOpen, setMistakesOpen] = useState(false)

  // 12. sınıf / mezun Derslerim'de TYT (9+10), AYT (11) ve 12 arasında geçer.
  // 9, 10 ve 11. sınıflar yalnızca kendi sınıflarını görür; seçici gösterilmez.
  type Gorunum = 'TYT' | 'AYT' | 12
  const [gorunum, setGorunum] = useState<Gorunum>(() => {
    const saved = localStorage.getItem(VIEW_KEY)
    return saved === 'AYT' ? 'AYT' : saved === '12' ? 12 : 'TYT'
  })

  // Öğretmen görünümü: yalnızca öğretmen Google hesabıyla giriş yapınca
  // bütün sınıfların dersleri ve yazılıları açılır.
  const cloud = useCloud()
  const [ogretmenSinif, setOgretmenSinif] = useState<number>(() => {
    const saved = Number(localStorage.getItem(TEACHER_GRADE_KEY))
    return ALL_GRADES.includes(saved as 9) ? saved : 9
  })
  const teacherReal = isTeacher(cloud.user)

  // Öğretmen için geçici öğrenci önizlemesi: seçilen sınıf ve amaçla
  // uygulamayı bir öğrenci gibi gösterir; gerçek profil değişmez.
  const [onizleme, setOnizleme] = useState<Onizleme | null>(() => {
    try {
      const raw = sessionStorage.getItem(PREVIEW_KEY)
      return raw ? (JSON.parse(raw) as Onizleme) : null
    } catch {
      return null
    }
  })
  const previewing = !!onizleme
  const teacherView = teacherReal && !onizleme
  const profile: StudentProfile | null =
    storedProfile && previewing && onizleme ? { ...storedProfile, ...onizleme } : storedProfile

  function startPreview(next: Onizleme) {
    sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(next))
    setOnizleme(next)
    setOpenTopic(null)
    setMistakesOpen(false)
    const sayfa = startPage[next.purpose]
    setPage(sayfa)
    window.scrollTo({ top: 0 })
  }

  function stopPreview() {
    sessionStorage.removeItem(PREVIEW_KEY)
    setOnizleme(null)
    setOpenTopic(null)
    setPage('progress')
  }

  const mod: Mod = profile ? modOf(profile.purpose, profile.grade, teacherView) : 'tam'
  const yaziliKonulari = useYaziliKonulari(profile ? [profile.grade] : [], mod === 'yazili')
  // "Belirli bir konuyu öğrenmek" planı: öğrenci tek bir konu seçer; diğerleri
  // plan değiştirilene kadar kilitli kalır.
  const [seciliKonu, setSeciliKonu] = useState<string | null>(() => localStorage.getItem(SECILI_KONU_KEY))
  const [konuOnay, setKonuOnay] = useState<{ grade: number; kod: string; ad: string } | null>(null)
  useBackStep(!!konuOnay, () => setKonuOnay(null))

  function konuSec(grade: number, kod: string) {
    const key = `${grade}|${kod}`
    localStorage.setItem(SECILI_KONU_KEY, key)
    setSeciliKonu(key)
    setKonuOnay(null)
    setOpenTopic({ grade, kod })
    window.scrollTo({ top: 0 })
    syncNow()
  }

  function konuSeciminiSil() {
    localStorage.removeItem(SECILI_KONU_KEY)
    setSeciliKonu(null)
  }

  // 12. sınıf TYT (9, 10) ve AYT (11) için ayrı ayrı taranabilir; hepsi birleştirilir.
  const t9 = useTaramaSonucu(9)
  const t10 = useTaramaSonucu(10)
  const t11 = useTaramaSonucu(11)
  const taramaDurum = new Map(
    [t9, t10, t11]
      .filter(t => t && (profile?.grade === 12 || t.grade === profile?.grade))
      .flatMap(t => [...eksikKonular(t)])
  )

  // Tarama sonunda seçilen plan: amaç güncellenir, uygulama yeni plana göre açılır.
  function choosePlan(purpose: StudyPurpose) {
    konuSeciminiSil()
    if (previewing && onizleme) {
      const next = { ...onizleme, purpose }
      sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(next))
      setOnizleme(next)
    } else if (storedProfile) {
      const next = { ...storedProfile, purpose, updatedAt: new Date().toISOString() }
      saveProfile(next)
      setProfile(next)
      syncNow()
    }
    changePage(startPage[purpose])
  }

  // Telefonun geri tuşu: açık ekranı kapatır, ana sekmeye döner; ana sekmede uygulamadan çıkar.
  const homePage = MOD_SAYFALARI[mod][0].id
  useBackStep(!!profile && !editingProfile && page !== homePage, () => changePage(homePage))

  const sayilanSayfa = !profile || editingProfile ? 'giris' : page
  useEffect(() => {
    sayfaSay(sayilanSayfa)
  }, [sayilanSayfa])
  useBackStep(!!openTopic, () => setOpenTopic(null))
  useBackStep(mistakesOpen, () => setMistakesOpen(false))
  useBackStep(editingProfile && !!storedProfile, () => setEditingProfile(false))

  function changeTeacherGrade(next: number) {
    setOgretmenSinif(next)
    setOpenTopic(null)
    localStorage.setItem(TEACHER_GRADE_KEY, String(next))
  }

  function changeView(next: Gorunum) {
    setGorunum(next)
    setOpenTopic(null)
    localStorage.setItem(VIEW_KEY, String(next))
  }

  function changePage(next: PageId) {
    setPage(next)
    setOpenTopic(null)
    setMistakesOpen(false)
    localStorage.setItem(PAGE_KEY, next)
    window.scrollTo({ top: 0 })
  }

  // Koçun önerdiği eyleme git.
  function openStudyTopic(grade: number, topicId: string, tab: TopicTab = 'anlatim') {
    const kod = topicId.startsWith(grade + '-') ? topicId.slice(String(grade).length + 1) : topicId
    const key = grade + '|' + kod
    if (mod === 'konu' && seciliKonu !== key) { konuSec(grade, kod); changePage('lessons'); setOpenTopic({ grade, kod, tab }); return }
    const blocked = mod === 'tam' && !teacherView && kilitliKonular([grade], bilinen).has(key)
    if (blocked) { changePage('lessons'); return }
    changePage('lessons')
    if (grade === 12) setGorunum(12)
    else if (profile?.grade === 12) setGorunum(grade === 11 ? 'AYT' : 'TYT')
    if (konuBul(grade, kod)) setOpenTopic({ grade, kod, tab })
  }

  function coachAction(eylem: Eylem) {
    if (eylem.tur === 'hata') {
      changePage('progress')
      setMistakesOpen(true)
      return
    }
    changePage('lessons')
    if (eylem.tur === 'dersler') return
    const key = `${eylem.grade}|${eylem.kod}`
    const kilitli =
      (mod === 'tam' && !teacherView && kilitliKonular([eylem.grade], bilinen).has(key)) ||
      (mod === 'konu' && localStorage.getItem(SECILI_KONU_KEY) !== key)
    if (!kilitli) setOpenTopic({ grade: eylem.grade, kod: eylem.kod, tab: eylem.tur })
  }

  function updateStudentGoal(goal: string) {
    setStudentGoal(goal)
    if (goal.trim()) localStorage.setItem(GOAL_KEY, goal)
    else localStorage.removeItem(GOAL_KEY)
  }

  function finishOnboarding(next: StudentProfile) {
    if (next.purpose !== storedProfile?.purpose) konuSeciminiSil()
    setProfile(next)
    setEditingProfile(false)
    setStudentGoal(localStorage.getItem(GOAL_KEY) || '')
    changePage(startPage[next.purpose])
    syncNow()
  }

  if (!profile || editingProfile) {
    return (
      <Onboarding
        initial={storedProfile}
        onDone={finishOnboarding}
        onCancel={storedProfile ? () => setEditingProfile(false) : undefined}
      />
    )
  }

  const activeGrades = profilSiniflari(profile)
  const activeLabel = profilEtiketi(profile)
  const avatar = profile.grade
  const isSenior = profile.grade === 12
  const viewGrades = teacherView
    ? [ogretmenSinif]
    : !isSenior ? [profile.grade] : gorunum === 12 ? [12] : SINAV_SINIFLARI[gorunum]
  const show12Placeholder = teacherView ? ogretmenSinif === 12 : isSenior && gorunum === 12
  const contentGrades = viewGrades.filter(grade => sinifMufredati(grade))
  // 12. sınıfta okul yazılısı yok; sınav sekmesi yalnızca TYT/AYT testleridir.
  const navPages = MOD_SAYFALARI[mod].map(m => {
    const base = pages.find(item => item.id === m.id)!
    return { ...base, label: m.label ?? base.label, short: m.short ?? base.short }
  })
  const shown: PageId = navPages.some(item => item.id === page) ? page : navPages[0].id
  const current = navPages.find(item => item.id === shown)!
  const labelOf = (item: (typeof navPages)[number]) =>
    item.id === 'exams' && isSenior && !teacherView ? 'TYT / AYT testleri' : item.label
  // Tam modda öğrenci konuları sırayla açar (öğretmende kilit yok).
  const bilinen = new Set([...taramaDurum].filter(([, d]) => d === 'tamam').map(([k]) => k))
  const konuKilitleri =
    mod === 'konu' && seciliKonu
      ? new Set(contentGrades.flatMap(g => tumKonular(g).map(({ konu }) => `${g}|${konu.kod}`)).filter(k => k !== seciliKonu))
      : undefined
  const yaziliKilitleri =
    mod === 'yazili' && yaziliKonulari
      ? new Set(contentGrades.flatMap(g => tumKonular(g).map(({ konu }) => `${g}|${konu.kod}`)).filter(k => !yaziliKonulari.kodlar.has(k)))
      : undefined
  const kilitler = mod === 'tam' && !teacherView
    ? kilitliKonular(viewGrades, bilinen)
    : mod === 'yazili' ? yaziliKilitleri : konuKilitleri
  const seciliKonuBilgi = mod === 'konu' && seciliKonu
    ? konuBul(Number(seciliKonu.split('|')[0]), seciliKonu.split('|')[1])
    : null

  return (
    <div className="app">
      <aside className="side" aria-label="Ana menü">
        <div className="brand">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={36} height={36} />
          <span className="label">Kimya Koçun</span>
        </div>

        <nav className="side-nav">
          {navPages.map(item => (
            <button
              key={item.id}
              type="button"
              className={item.id === shown ? 'nav-item is-active' : 'nav-item'}
              onClick={() => changePage(item.id)}
              aria-current={item.id === shown ? 'page' : undefined}
              title={labelOf(item)}
            >
              <Icon name={item.icon} />
              <span className="label">{labelOf(item)}</span>
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="profile"
          onClick={() => setEditingProfile(true)}
          title="Çalışma amacını ve düzenini değiştir"
        >
          <span className="avatar">{avatar}</span>
          <span className="label">
            {isSenior ? '12. sınıf · TYT + AYT' : `${profile.grade}. sınıf`}
            <small>{teacherView ? 'Öğretmen görünümü' : 'Amacımı değiştir'}</small>
          </span>
        </button>
      </aside>

      <main className="main">
        <Suspense fallback={<p className="muted page-loading">Yükleniyor…</p>}>
        {previewing && onizleme && (
          <div className="preview-banner" role="status">
            <span>
              <b>Öğrenci önizlemesi</b> · {onizleme.grade}. sınıf · {purposeTitle(onizleme.purpose)}
            </span>
            <button type="button" className="btn-secondary" onClick={stopPreview}>Önizlemeyi bitir</button>
          </div>
        )}
        <button
          type="button"
          className="mobile-profile"
          onClick={() => setEditingProfile(true)}
          aria-label="Çalışma amacını ve düzenini değiştir"
        >
          {avatar}
        </button>

        {shown === 'today' && (
          <TodayPage
            selectedGrade={profile.grade}
            grades={activeGrades}
            gradeLabel={activeLabel}
            onOpenTopic={openStudyTopic}
            onOpenProgram={() => changePage('program')}
            knownTopics={bilinen}
            studentGoal={studentGoal}
            onGoalChange={updateStudentGoal}
            onOpenLessons={() => changePage('lessons')}
            onOpenMistakes={() => {
              changePage('progress')
              setMistakesOpen(true)
            }}
          />
        )}

        {shown !== 'today' && (
          <div className="page-head">
            <div>
              <small>Kimya Koçun</small>
              <h1>{labelOf(current)}</h1>
            </div>
          </div>
        )}

        {shown === 'lessons' && openTopic && (
          <TopicPage
            key={`${openTopic.grade}-${openTopic.kod}-${openTopic.tab ?? ""}`}
            grade={openTopic.grade}
            kod={openTopic.kod}
            initialTab={openTopic.tab}
            onBack={() => {
              setOpenTopic(null)
              window.scrollTo({ top: 0 })
            }}
          />
        )}

        {shown === 'lessons' && !openTopic && (
          <div className="stack">
            <details className="card classroom-preview"><summary>9, 10, 11, 12. sınıf öğrenci görünümünü dene</summary><StudentPreviewCard onStart={startPreview} /></details>
            <ResourceLibrary grades={viewGrades} />
            {teacherView && (
              <section className="card teacher-view">
                <h3 className="card-title">
                  <Icon name="users" />
                  Öğretmen görünümü
                </h3>
                <div className="grade-picker" role="group" aria-label="Sınıf">
                  {ALL_GRADES.map(item => (
                    <button
                      key={item}
                      type="button"
                      className={ogretmenSinif === item ? 'chip is-active' : 'chip'}
                      onClick={() => changeTeacherGrade(item)}
                      aria-pressed={ogretmenSinif === item}
                    >
                      {item}. sınıf
                      <small>{item === 12 ? 'hazırlanıyor' : 'tüm konular'}</small>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {isSenior && !teacherView && (
              <section className="card">
                <h3 className="card-title">Ne çalışmak istiyorsun?</h3>
                <div className="grade-picker" role="group" aria-label="TYT, AYT ya da 12. sınıf">
                  {(['TYT', 'AYT', 12] as const).map(item => (
                    <button
                      key={item}
                      type="button"
                      className={gorunum === item ? 'chip is-active' : 'chip'}
                      onClick={() => changeView(item)}
                      aria-pressed={gorunum === item}
                    >
                      {item === 12 ? '12. sınıf' : item}
                      <small>
                        {item === 12 ? 'hazırlanıyor' : `${SINAV_SINIFLARI[item].join(' + ')}. sınıf konuları`}
                      </small>
                    </button>
                  ))}
                </div>
                {gorunum === 'AYT' && (
                  <p className="muted small picker-note">
                    AYT'nin 12. sınıf konuları yeni Maarif programı yayımlanınca eklenecek.
                  </p>
                )}
              </section>
            )}

            {!isSenior && !teacherView && (
              <h2 className="section-title">{profile.grade}. sınıf kimya</h2>
            )}

            {mod === 'yazili' && yaziliKonulari && (
              <p className="program-message">
                {yaziliKonulari.donem
                  ? `${yaziliKonulari.donem}. dönem ${yaziliKonulari.yazili}. yazılının kapsamındaki konular açık; diğerleri kilitli. Başka bir yazılıya çalışmak için Yazılı sayfasından dönemi ve yazılıyı seç.`
                  : 'Yazılı sınavları henüz eklenmedi.'}
              </p>
            )}

            {mod === 'konu' && !seciliKonu && (
              <p className="program-message">
                Öğrenmek istediğin konuyu seç. Yalnızca bir konu seçebilirsin; başka bir konu için planını değiştirmen gerekir.
              </p>
            )}

            {mod === 'konu' && seciliKonuBilgi && (
              <section className="card konu-secim">
                <div>
                  <small className="muted">Seçtiğin konu</small>
                  <b>{seciliKonuBilgi.konu.kod} · {seciliKonuBilgi.konu.ad}</b>
                  <p className="muted small">Diğer konular kilitli. Başka bir konu çalışmak istersen planını değiştir.</p>
                </div>
                <div className="row-actions start">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setOpenTopic({ grade: Number(seciliKonu!.split('|')[0]), kod: seciliKonuBilgi.konu.kod })
                      window.scrollTo({ top: 0 })
                    }}
                  >
                    Konuya git
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setEditingProfile(true)}>
                    Planı değiştir
                  </button>
                </div>
              </section>
            )}

            {konuOnay && (
              <div className="modal-backdrop" role="presentation" onClick={() => setKonuOnay(null)}>
                <div className="modal konu-onay" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                  <div className="modal-body">
                    <h3>{konuOnay.kod} · {konuOnay.ad}</h3>
                    <p>
                      Bu konuyu seçince diğer konular kilitlenecek. Başka bir konu çalışmak için planını değiştirmen gerekecek.
                      Bu konuyu seçmek istediğine emin misin?
                    </p>
                  </div>
                  <div className="modal-foot">
                    <div className="row-actions">
                      <button type="button" className="btn-secondary" onClick={() => setKonuOnay(null)}>Vazgeç</button>
                      <button type="button" className="primary-button" onClick={() => konuSec(konuOnay.grade, konuOnay.kod)}>
                        Evet, bu konuyu seç
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mod === 'tam' && kilitler && kilitler.size > 0 && (
              <p className="muted small lock-note">
                Konular sırayla açılır: bir konunun testinden %70 ve üstü alınca sıradaki konu açılır.
              </p>
            )}

            {contentGrades.map(grade => (
              <div key={grade} className="stack">
                {viewGrades.length > 1 && <h2 className="section-title">{grade}. sınıf konuları</h2>}
                <CurriculumPage
                  grade={grade}
                  locked={kilitler}
                  lockReason={
                    mod === 'konu' ? 'Planını değiştirince açılır' : mod === 'yazili' ? 'Bu yazılının kapsamında değil' : undefined
                  }
                  tarama={taramaDurum}
                  onOpenTopic={kod => {
                    if (mod === 'konu' && !seciliKonu) {
                      const k = konuBul(grade, kod)
                      setKonuOnay({ grade, kod, ad: k?.konu.ad ?? kod })
                      return
                    }
                    setOpenTopic({ grade, kod })
                    window.scrollTo({ top: 0 })
                  }}
                />
              </div>
            ))}

            {show12Placeholder && (
              /* 12. sınıf içeriği hazır olana kadar kendi konularını ekleyebilir. */
              <div className="stack">
                <p className="program-message">
                  12. sınıfın konu anlatımı ve testleri yeni Maarif programıyla hazırlanacak. Şimdilik kendi konularını ekleyip takip edebilirsin.
                </p>
                <StudyTopics selectedGrade={12} />
                <LearningTracker selectedGrade={12} />
              </div>
            )}
          </div>
        )}

        {shown === 'exams' && (
          teacherView
            ? <ExamsPage grades={SINAV_SINIFLARI.TYT_AYT} label="Tüm sınıflar" showWritten />
            : <ExamsPage grades={activeGrades} label={activeLabel} showWritten={!isSenior} onlyWritten={mod === 'yazili'} sirali={mod === 'tam'} bilinen={bilinen} />
        )}

        {shown === 'practice' && <PracticePage grade={profile.grade} />}

        {shown === 'screening' && (
          <ScreeningPage
            grade={profile.grade}
            onChoosePlan={choosePlan}
          />
        )}

        {shown === 'coach' && (
          <CoachPage grades={teacherView ? SINAV_SINIFLARI.TYT_AYT : activeGrades} onAction={coachAction} />
        )}

        {shown === 'program' && (
          <ProgramPage
            onOpenTopic={openStudyTopic}
            profile={profile}
            onProfileChange={next => {
              // Yalnızca çalışma düzeni kaydedilir; önizlemedeki sınıf/amaç gerçek profile yazılmaz.
              if (!storedProfile) return
              const merged = { ...storedProfile, days: next.days, dailyMinutes: next.dailyMinutes, updatedAt: next.updatedAt }
              saveProfile(merged)
              setProfile(merged)
            }}
            onOpenLessons={() => changePage('lessons')}
          />
        )}

        {shown === 'progress' && mistakesOpen && (
          <MistakeBook grades={activeGrades} onClose={() => setMistakesOpen(false)} />
        )}

        {shown === 'progress' && !mistakesOpen && (
          <ProgressPage
            grades={activeGrades}
            label={activeLabel}
            onOpenLessons={() => changePage('lessons')}
            onOpenMistakes={() => {
              setMistakesOpen(true)
              window.scrollTo({ top: 0 })
            }}
            onPreview={!previewing ? startPreview : undefined}
          />
        )}

        {import.meta.env.DEV && (
          <details className="dev-tools">
            <summary>
              <Icon name="tools" size={18} />
              Geliştirme araçları · soru havuzu
            </summary>
            <QuestionBankManager />
          </details>
        )}
      </Suspense>
      </main>

      <nav className="tabbar" aria-label="Alt menü" style={{ gridTemplateColumns: `repeat(${navPages.length}, 1fr)` }}>
        {navPages.map(item => (
          <button
            key={item.id}
            type="button"
            className={item.id === shown ? 'tab is-active' : 'tab'}
            onClick={() => changePage(item.id)}
            aria-current={item.id === shown ? 'page' : undefined}
          >
            <Icon name={item.icon} size={22} />
            {item.short}
          </button>
        ))}
      </nav>
    </div>
  )
}

function ReviewPage({
  grades,
  onOpenLessons,
}: {
  grades: number[]
  onOpenLessons: () => void
}) {
  const learned = loadTopics().filter(
    topic =>
      grades.includes(topic.grade) &&
      getTopicProgress(topic.grade, topic.id)?.status === 'learned'
  )

  return (
    <section className="card">
      <h3 className="card-title">
        <Icon name="repeat" />
        Kalıcı hâle getirilecek konular
      </h3>
      {learned.length === 0 ? (
        <p className="muted">
          Öğrendiğin konular burada görünür. Programım sayfasındaki
          program oluşturucu bunlara 1, 3, 7, 14 ve 30 gün sonra tekrar
          görevi ekler.
        </p>
      ) : (
        <ul className="task-list">
          {learned.map(topic => (
            <li key={topic.id}>
              <span className="task-check tone-teal"><Icon name="check" /></span>
              <span className="task-title">
                {topic.title}
                {grades.length > 1 && <small className="muted"> · {topic.grade}. sınıf</small>}
              </span>
              <button type="button" className="btn-secondary" onClick={onOpenLessons}>
                Tekrar et
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ProgressPage({
  grades,
  label,
  onOpenLessons,
  onOpenMistakes,
  onPreview,
}: {
  grades: number[]
  label?: string
  onOpenLessons: () => void
  onOpenMistakes: () => void
  onPreview?: (next: Onizleme) => void
}) {
  const hatalar = useHataDefteri().filter(item => grades.includes(item.grade))
  const acikHata = hatalar.filter(item => item.durum === 'acik').length
  const summaries = grades.map(grade => getGradeLearningSummary(grade))
  const total = (key: 'studied' | 'learned' | 'permanent') =>
    summaries.reduce((sum, item) => sum + item[key], 0)

  return (
    <div className="today-grid">
      <div className="col">
        <section className="card">
          <h3 className="card-title">
            <Icon name="chart" />
            Öğrenme durumum
            {label && <span className="card-link">{label}</span>}
          </h3>
          {grades.length === 0 ? (
            <p className="muted">Gelişimini görmek için önce sınıfını seç.</p>
          ) : (
            <div className="stats">
              <div className="stat"><small>Çalışıldı</small><b>{total('studied')}</b></div>
              <div className="stat"><small>Öğrenildi</small><b>{total('learned')}</b></div>
              <div className="stat"><small>Kalıcı</small><b>{total('permanent')}</b></div>
            </div>
          )}
        </section>
        <section className="card">
          <h3 className="card-title">
            <Icon name="notebook" />
            Hata defterim
          </h3>
          <p className="muted">
            {hatalar.length === 0
              ? 'Testlerde yanlış yaptığın ya da boş bıraktığın sorular burada birikir.'
              : `${acikHata} açık hata · ${hatalar.length - acikHata} düzeltildi`}
          </p>
          <button type="button" className={acikHata ? 'primary-button' : 'btn-secondary'} onClick={onOpenMistakes}>
            Hata defterini aç
          </button>
        </section>
        <KazanimRaporu grades={grades} />
        <ReviewPage grades={grades} onOpenLessons={onOpenLessons} />
      </div>
      <div className="col">
        {onPreview && <StudentPreviewCard onStart={onPreview} />}
        <AccountCard />
        <LocalBackupCard />
        <OfflineCard grades={grades} />
        <TopicMap grades={grades} label={label} onOpenLessons={onOpenLessons} />
      </div>
    </div>
  )
}

export default App
