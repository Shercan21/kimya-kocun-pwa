import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon'
import { tumKonular } from '../data/content'
import { loadLearningProgress } from '../data/learningProgress'
import { sonuclariYukle } from '../data/results'
import { useStudyTasks, updateStudyTasks, type StudyTask } from '../data/studyTasks'
import { NEDEN_AD, type HataKaydi, type HataNedeni } from '../data/mistakes'
import type { StudentProfile } from '../data/profile'
import type { Eylem } from '../data/coach'
import { buildCoachReply, proposeCoachSchedule, dateKey, type CoachIntent } from '../data/coachCompanion'
import '../coach-companion.css'

type Props = { grades: number[]; allowed: Set<string>; known: Set<string>; mistakes: HataKaydi[]; profile?: StudentProfile; goal?: string; canSchedule: boolean; onAction: (action:Eylem)=>void; onDetails:()=>void }
const prompts: {id:CoachIntent;label:string;icon:'target'|'book'|'clock'|'chart'}[]=[{id:'today',label:'Bugün ne çalışayım?',icon:'target'},{id:'stuck',label:'Zorlandım',icon:'book'},{id:'short',label:'Az vaktim var',icon:'clock'},{id:'progress',label:'Gelişimimi göster',icon:'chart'}]
const taskTime=(t:StudyTask)=>t.minutes&&t.minutes>0?t.minutes:15
const actionLabel=(a:Eylem)=>a.tur==='hata'?'Hata defterini aç':a.tur==='dersler'?'Dersleri aç':a.tur==='anlatim'?(a.kisa?'Kısa özeti aç':'Örnekleri incele'):a.tur==='etkinlik'?'Etkinliği aç':a.seviye?`${a.seviye} testi aç`:'Testleri aç'

export default function CoachCompanion({grades,allowed,known,mistakes,profile,goal,canSchedule,onAction,onDetails}:Props){
 const [intent,setIntent]=useState<CoachIntent>('today'),[minutes,setMinutes]=useState(Math.min(45,profile?.dailyMinutes||20)),[selected,setSelected]=useState(''),[reason,setReason]=useState<HataNedeni|null>(null),[now,setNow]=useState(()=>new Date()),[preview,setPreview]=useState(false),[notice,setNotice]=useState(''),[undo,setUndo]=useState<{before:StudyTask[];after:StudyTask[]}|null>(null)
 const tasks=useStudyTasks()
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer)},[])
 const topics=useMemo(()=>grades.flatMap(grade=>tumKonular(grade).map(({konu})=>({grade,konu}))),[grades])
 const today=dateKey(now)
 const pendingAutomatic=(t:StudyTask)=>t.date===today&&!t.completed&&t.grade!==undefined&&grades.includes(t.grade)&&!!t.topicId&&['study','quiz','review'].includes(t.kind||'')
 const reserved=tasks.filter(t=>t.date===today&&!pendingAutomatic(t)).reduce((n,t)=>n+taskTime(t),0)
 const capacity=canSchedule?Math.max(0,(profile?.dailyMinutes||45)-reserved):minutes
 const available=Math.min(minutes,capacity)
 const reply=useMemo(()=>buildCoachReply({topics,allowed,known,progress:loadLearningProgress(),results:sonuclariYukle(),mistakes,tasks,now,minutes:available,intent,selected:intent==='stuck'||intent==='short'?selected:undefined,reason}),[topics,allowed,known,mistakes,tasks,now,available,intent,selected,reason])
 const proposal=useMemo(()=>proposeCoachSchedule(tasks,reply.steps,{today,grades,dailyMinutes:profile?.dailyMinutes||45,weekdays:profile?.days||[0,1,2,3,4]}),[tasks,reply.steps,today,grades,profile])
 const total=reply.steps.reduce((n,s)=>n+s.minutes,0)
 function choose(next:CoachIntent){setIntent(next);if(next==='short')setMinutes(10);setPreview(false);setNotice('')}
 function applyPlan(){try{let before:StudyTask[]=[],after:StudyTask[]=[];updateStudyTasks(current=>{const next=proposeCoachSchedule(current,reply.steps,{today,grades,dailyMinutes:profile?.dailyMinutes||45,weekdays:profile?.days||[0,1,2,3,4]});if(next.error)throw Error(next.error);before=current;after=next.tasks;return next.tasks});setUndo({before,after});setPreview(false);setNotice('Bugünkü planın güncellendi. Tamamlanan ve özel görevlerin korundu.')}catch(e){setNotice(e instanceof Error?e.message:'Program güncellenemedi.')}}
 function undoPlan(){if(!undo)return;try{updateStudyTasks(current=>{if(JSON.stringify(current)!==JSON.stringify(undo.after))throw Error('Programda başka değişiklikler var. Onları kaybetmemek için otomatik geri almadım.');return undo.before});setUndo(null);setNotice('Önceki programına dönüldü.')}catch(e){setNotice(e instanceof Error?e.message:'Geri alınamadı.')}}
 return <section className="coach-companion" aria-label="Kişisel çalışma koçu">
  <header className="companion-heading"><div className="companion-avatar"><Icon name="flask" size={27}/><span/></div><div><span className="eyebrow">KİMYA KOÇUN</span><h2>Bir sonraki adımı birlikte seçelim.</h2><p>Öneriler çalışma kayıtlarına göre hazırlanır. Yapay zekâ servisi kullanılmaz.</p></div></header>
  <div className="companion-memory"><Icon name="repeat" size={19}/><p>{reply.memory}</p></div>
  {goal?.trim()&&<p className="companion-goal"><Icon name="target" size={16}/><span>Hedefin: {goal}</span></p>}
  <div className="companion-prompts" role="group" aria-label="Koçuna sor">{prompts.map(p=><button key={p.id} type="button" className={intent===p.id?'is-active':''} aria-pressed={intent===p.id} onClick={()=>choose(p.id)}><Icon name={p.icon} size={19}/>{p.label}</button>)}</div>
  {intent!=='progress'&&<div className="companion-controls"><fieldset><legend>Şimdi ne kadar vaktin var?</legend><div className="companion-time">{[10,20,30,45,60].map(value=><button type="button" key={value} aria-pressed={minutes===value} className={minutes===value?'is-selected':''} onClick={()=>{setMinutes(value);setPreview(false)}}>{value} dk</button>)}</div></fieldset>{(intent==='stuck'||intent==='short')&&<label>Hangi konu?<select value={selected} onChange={e=>{setSelected(e.target.value);setPreview(false)}}><option value="">Koç kayıtlarıma göre seçsin</option>{topics.filter(t=>allowed.has(`${t.grade}|${t.konu.kod}`)).map(t=><option key={`${t.grade}|${t.konu.kod}`} value={`${t.grade}|${t.konu.kod}`}>{t.grade}. sınıf · {t.konu.ad}</option>)}</select></label>}</div>}
  {intent==='stuck'&&<div className="companion-reasons"><span>Nerede zorlandığını seçebilirsin; nedenini kendiliğimden tahmin etmiyorum.</span><div role="group" aria-label="Zorlanma nedeni">{(Object.keys(NEDEN_AD) as HataNedeni[]).map(value=><button type="button" key={value} aria-pressed={reason===value} className={reason===value?'is-selected':''} onClick={()=>{setReason(reason===value?null:value);setPreview(false)}}>{NEDEN_AD[value]}</button>)}</div></div>}
  <div className="companion-reply" key={intent}><span className="companion-reply-label"><Icon name="circleCheck" size={17}/> SANA GÖRE ÖNERİ</span><p role="status">{reply.message}</p>{reply.recognition&&<p className="companion-recognition"><Icon name="chart" size={18}/>{reply.recognition}</p>}
   {intent==='progress'?<><div className="companion-facts"><div><b>{reply.testCount}</b><span>test kaydı</span></div><div><b>{reply.completed}</b><span>bugün tamamlanan görev</span></div><div><b>{reply.openErrors}</b><span>açık soru</span></div></div><button type="button" className="btn-secondary" onClick={onDetails}>Konu ve hata raporlarımı aç <span>→</span></button></>:<>
    {reply.target&&<p className="companion-topic">{reply.target.grade}. sınıf · {reply.target.konu.ad}</p>}
    {reply.steps.length>0&&<ol className="companion-plan">{reply.steps.map((step,i)=><li key={step.id}><span className="companion-step-number">{String(i+1).padStart(2,'0')}</span><div><div className="companion-step-title"><h3>{step.title}</h3><span>~{step.minutes} dk</span></div><p>{step.detail}</p><button type="button" className={i===0?'primary-button':'btn-secondary'} onClick={()=>onAction(step.action)}>{actionLabel(step.action)} <Icon name="play" size={15}/></button></div></li>)}</ol>}
    <p className="companion-duration">{total>0?`Bu oturum yaklaşık ${total} dakika. Süreler öneridir; testini yarım bırakıp devam edebilirsin.`:'Yeni bir görev eklenmedi.'}{canSchedule&&available<minutes&&` Mevcut görevlerden sonra günlük programında ${available} dakika yer kaldığı için planı buna göre kısalttım.`}</p>
    {reply.evidence.length>0&&<details className="companion-evidence"><summary>Neden bunu öneriyorum?</summary><ul>{reply.evidence.map(text=><li key={text}>{text}</li>)}</ul></details>}
    {reply.missed>0&&<p className="companion-backlog">Son 7 günden {reply.missed} tamamlanmamış görevin görünüyor. Hepsini bugüne taşımıyorum; şu an yalnız bu oturuma odaklanıyoruz.</p>}
    {canSchedule&&reply.steps.length>0&&<div className="companion-schedule"><button type="button" className="btn-secondary" onClick={()=>setPreview(v=>!v)}>Bugünkü programı bu plana göre düzenle</button>{preview&&<div className="companion-schedule-preview"><h3>Program önizlemesi</h3>{proposal.error?<p role="alert">{proposal.error}</p>:<><p>{proposal.added.length} çalışma adımı bugüne yerleşecek. Tamamlanan ve özel görevler korunacak.</p><ul>{proposal.added.map(t=><li key={t.id}>{t.title} · {t.minutes} dk</li>)}</ul>{proposal.moved.length>0&&<><p>Bugünkü diğer otomatik görevler, süre sınırını aşmadan şu çalışma günlerine taşınacak:</p><ul>{proposal.moved.map(({task,to})=><li key={task.id}>{task.title} → {new Date(to+'T12:00:00').toLocaleDateString('tr-TR')}</li>)}</ul></>}<button type="button" className="primary-button" onClick={applyPlan}>Bu planı uygula</button></>}</div>}</div>}
   </>}
  </div>
  {notice&&<div className="companion-notice" role="status"><span>{notice}</span>{undo&&<button type="button" className="btn-ghost" onClick={undoPlan}>Plan değişikliğini geri al</button>}</div>}
 </section>
}
