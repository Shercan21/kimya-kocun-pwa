import type { Konu } from './content'
import type { LearningProgress } from './learningProgress'
import type { HataKaydi, HataNedeni } from './mistakes'
import type { TestSonucu } from './results'
import type { StudyTask } from './studyTasks'
import type { Eylem } from './coach'

export type CoachIntent = 'today' | 'stuck' | 'short' | 'progress'
export type CoachTopic = { grade: number; konu: Konu }
export type CoachStep = { id: string; title: string; detail: string; minutes: number; action: Eylem; grade: number; kod: string; kind: 'study' | 'quiz' | 'review' }
export type CoachInput = { topics: CoachTopic[]; allowed: Set<string>; known: Set<string>; progress: LearningProgress[]; results: TestSonucu[]; mistakes: HataKaydi[]; tasks: StudyTask[]; now: Date; minutes: number; intent: CoachIntent; selected?: string; reason?: HataNedeni | null }
export type CoachReply = { message: string; memory: string; evidence: string[]; recognition: string; steps: CoachStep[]; target: CoachTopic | null; score: number | null; missed: number; completed: number; testCount: number; openErrors: number; budget: number }
const DAY = 86400000
export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const topicKey = (t: CoachTopic) => `${t.grade}|${t.konu.kod}`
const topicId = (t: CoachTopic) => `${t.grade}-${t.konu.kod}`
const validTime = (s: string | null | undefined, now: number) => !!s && Number.isFinite(Date.parse(s)) && Date.parse(s) <= now
const rate = (r: TestSonucu) => r.toplam > 0 ? Math.round(r.dogru / r.toplam * 100) : null
const duration = (t: StudyTask) => typeof t.minutes === 'number' && t.minutes > 0 ? t.minutes : 15
function topicScore(r: TestSonucu, t: CoachTopic): number | null {
  if (r.grade !== t.grade) return null
  if (r.konuKod === t.konu.kod) return rate(r)
  let correct=0,total=0
  for (const k of t.konu.kazanimlar) { const value=r.kazanimlar?.[k]; if(value){correct+=value[0];total+=value[1]} }
  return total ? Math.round(correct/total*100) : null
}
function hasTest(t: CoachTopic) { return !!t.konu.test || t.konu.baglam.length>0 }
function relativeDay(time: string, now: Date) {
  const d=new Date(time)
  const days=Math.round((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()))/DAY)
  return days===0?'Bugün':days===1?'Dün':days+' gün önce'
}

export function buildCoachReply(input: CoachInput): CoachReply {
  const {now,intent}=input, stamp=now.getTime(), today=dateKey(now)
  const grades=new Set(input.topics.map(t=>t.grade))
  const topics=input.topics.filter(t=>input.allowed.has(topicKey(t)))
  const results=input.results.filter(r=>grades.has(r.grade)&&r.toplam>0&&validTime(r.tarih,stamp)).slice().sort((a,b)=>Date.parse(a.tarih)-Date.parse(b.tarih))
  const progress=input.progress.filter(p=>grades.has(p.grade))
  const open=input.mistakes.filter(h=>grades.has(h.grade)&&h.durum==='acik')
  const missed=input.tasks.filter(t=>!t.completed&&t.date<today&&t.date>=dateKey(new Date(stamp-7*DAY))&&(t.grade===undefined||grades.has(t.grade))).length
  const completed=input.tasks.filter(t=>t.completed&&t.date===today&&(t.grade===undefined||grades.has(t.grade))).length
  const latest=results.at(-1)
  const lastProgress=progress.filter(p=>validTime(p.updatedAt,stamp)).slice().sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt))[0]
  let memory='Henüz yeterli çalışma kaydın yok. Bir konuyla başladığında sonraki önerileri sonuçlarına göre değiştireceğim.'
  if(latest){const topic=input.topics.find(t=>t.grade===latest.grade&&t.konu.kod===latest.konuKod);memory=`${relativeDay(latest.tarih,now)} ${topic?topic.konu.ad+' konusunda':'bir testte'} ${latest.dogru}/${latest.toplam} doğru yaptın. Sonraki adımı bu kaydı da dikkate alarak seçiyorum.`}
  else if(lastProgress){memory=`${relativeDay(lastProgress.updatedAt,now)} ${lastProgress.topicTitle} için çalışma kaydın var. Şimdi öğrendiklerini kısa bir çalışmayla yoklayabiliriz.`}
  let recognition=''
  if(latest){const previous=results.slice(0,-1).reverse().find(r=>r.testId===latest.testId&&r.seviye===latest.seviye&&r.toplam===latest.toplam);if(previous&&latest.dogru>previous.dogru)recognition=`Aynı testin son iki kaydında ${previous.dogru}/${previous.toplam} doğrudan ${latest.dogru}/${latest.toplam} doğruya çıktın. İlerleme kaydın var.`;else if(previous&&rate(latest)! < rate(previous)!)recognition='Son denemede sonuç düşmüş. Bu, bütün ilerlemenin kaybolduğu anlamına gelmez; zorlandığın adımı yeniden ele alalım.'}
  const histories=new Map(topics.map(t=>[topicKey(t),results.filter(r=>topicScore(r,t)!==null)]))
  const latestScore=(t:CoachTopic)=>{const r=histories.get(topicKey(t))?.at(-1);return r?topicScore(r,t):null}
  const pOf=(t:CoachTopic)=>progress.find(p=>p.grade===t.grade&&p.topicId===topicId(t))
  const due=topics.filter(t=>{const p=pOf(t);return p?.status==='learned'&&validTime(p.learnedAt,stamp)&&stamp-Date.parse(p.learnedAt!)>=7*DAY}).sort((a,b)=>Date.parse(pOf(a)!.learnedAt!)-Date.parse(pOf(b)!.learnedAt!))[0]
  const weak=topics.filter(t=>latestScore(t)!==null&&latestScore(t)!<70).sort((a,b)=>latestScore(a)!-latestScore(b)!)[0]
  const planned=topics.find(t=>input.tasks.some(task=>task.date===today&&!task.completed&&task.grade===t.grade&&task.topicId===topicId(t)))
  const studied=topics.find(t=>pOf(t)?.status==='studied'&&!histories.get(topicKey(t))?.length)
  const next=topics.find(t=>!input.known.has(topicKey(t))&&(!pOf(t)||pOf(t)?.status==='not_started'))
  const chosen=input.selected?topics.find(t=>topicKey(t)===input.selected):undefined
  const target=chosen??due??weak??planned??studied??next??topics[0]??null
  const budget=Math.max(0,Math.min(90,Math.floor(Number.isFinite(input.minutes)?input.minutes:0)))
  const reply:CoachReply={message:'',memory,evidence:[],recognition,steps:[],target,score:target?latestScore(target):null,missed,completed,testCount:results.length,openErrors:open.length,budget}
  if(intent==='progress'){reply.message=results.length?`Şu ana kadar ${results.length} test kaydın ve bugün ${completed} tamamlanmış görevin var. ${open.length} açık soruyu da birlikte kapatabiliriz.`:'İlerlemeni karşılaştırmak için henüz test kaydı yok. İlk denemenden sonra sonuçlarını burada göstereceğim.';return reply}
  if(!target){reply.message='Şu an seçebileceğim açık bir konu yok. Derslerinden bir konu seç veya gerekli önceki konuyu tamamla.';return reply}
  const history=histories.get(topicKey(target))||[], last=history.at(-1), score=reply.score
  const errors=open.filter(h=>h.grade===target.grade&&h.konuKod===target.konu.kod)
  const counts=new Map<HataNedeni,number>();for(const h of errors)if(h.neden)counts.set(h.neden,(counts.get(h.neden)||0)+1)
  const dominant=[...counts].sort((a,b)=>b[1]-a[1])[0]
  const reason=intent==='stuck'?(input.reason??dominant?.[0]):dominant?.[0]
  if(chosen)reply.evidence.push('Bu konuyu sen seçtin.')
  else if(target===due)reply.evidence.push('Öğrenme kaydından bu yana en az 7 gün geçti; tekrar zamanı geldi.')
  else if(target===weak)reply.evidence.push('Açık konular arasında son kazanım sonucunda en çok burada zorlandın.')
  else if(target===planned)reply.evidence.push('Bu konu bugünkü programında zaten var.')
  else if(target===studied)reply.evidence.push('Konuyu çalıştım kaydın var; henüz ilgili test sonucu yok.')
  else if(target===next)reply.evidence.push('Bu konu açık ve henüz başlanmamış; önceki konu sırasını koruyorum.')
  else reply.evidence.push('Erişebildiğin konulardan kısa tekrar için seçildi.')
  if(last&&score!==null)reply.evidence.push(`Son ilgili test / kazanım kaydındaki başarı: %${score}.`)
  if(errors.length)reply.evidence.push(`Bu konuda ${errors.length} açık hata kaydı var.`)
  if(intent==='stuck'&&input.reason)reply.evidence.push('Öneriyi az önce seçtiğin zorlanma nedenine göre hazırladım.')
  else if(dominant)reply.evidence.push(`Bu konudaki açık hatalarda ${dominant[1]} kez aynı hata nedeni işaretlenmiş.`)
  const add=(title:string,detail:string,minutes:number,tur:'anlatim'|'test'|'etkinlik'|'hata',level?:'Kolay'|'Orta'|'Zor')=>{const remaining=budget-reply.steps.reduce((n,s)=>n+s.minutes,0);const amount=Math.min(minutes,remaining);if(amount<3)return;let type=tur;if(type==='etkinlik'&&!target.konu.etkinlik)type=target.konu.anlatim?'anlatim':hasTest(target)?'test':'hata';if(type==='anlatim'&&!target.konu.anlatim)type=hasTest(target)?'test':target.konu.etkinlik?'etkinlik':'hata';if(type==='test'&&!hasTest(target))type=target.konu.anlatim?'anlatim':target.konu.etkinlik?'etkinlik':'hata';if(type==='hata'&&!open.length)return;if(type!==tur){title=type==='anlatim'?'Anlatımla netleştir':type==='test'?'Testlerle kontrol et':type==='etkinlik'?'Etkinlikle pekiştir':'Hata defterine dön';detail='Bu konuda istediğin türde içerik bulunmadığından, mevcut içerikle çalışmanı öneriyorum. '+detail;}const action:Eylem=type==='hata'?{tur:'hata'}:{tur:type,grade:target.grade,kod:target.konu.kod,...(type==='anlatim'&&budget<=15?{kisa:true}:{}),...(type==='test'?{seviye:level??'Kolay'}:{})};reply.steps.push({id:topicKey(target)+'-'+reply.steps.length,title,detail,minutes:amount,action,grade:target.grade,kod:target.konu.kod,kind:type==='test'?'quiz':type==='anlatim'?'study':'review'})}
  reply.message=reason?`${target.konu.ad} için zorlandığın yeri küçük adımlara bölelim. Önce nedeni ele alalım, sonra kendini yeniden ölç.`:score!==null&&score<50?`${target.konu.ad} için önce temeli netleştirelim. Şimdilik zor sorular yerine anlatım ve çözümlü örneklerle ilerle.`:score!==null&&score<70?`${target.konu.ad} için hedefimiz önce %70. Kısa bir düzeltme çalışması ve kolay bir deneme uygun.`:`${target.konu.ad} için şimdi ${budget} dakikalık, tek konuya odaklanan bir çalışma yapabiliriz.`
  if(budget<3){reply.message='Bugünkü kapasiten dolu. Yeni görev eklemek yerine tamamladıklarını inceleyebilir veya programını düzenleyebilirsin.';return reply}
  if(reason==='kavram'){add('Kavramları karşılaştır','Bir eşleştirme veya doğru–yanlış etkinliği seç. İki kavramın farkını kendi cümlenle yaz.',Math.min(8,budget),'etkinlik');if(budget>=15)add('Örnekle kontrol et','Anlatımdaki bir örnekte hangi kavramın kullanıldığını açıklamayı dene.',7,'anlatim')}
  else if(reason==='islem'){add('Çözümlü bir örneği yeniden kur','Verilenleri ve birimleri yaz. Çözümü kapatıp aynı adımları kendin uygula.',Math.min(10,budget),'anlatim');if(budget>=18)add('Kolay işlem çalışması','Kolay testte birimleri kontrol ederek ilerle. Süren dolarsa cevapların saklanır.',12,'test','Kolay')}
  else if(reason==='dikkat'){add('Soru kökünü kontrol et','Hata defterinde 2 soruya bak. Değildir, yanlıştır ve en az gibi ifadeleri işaretle.',Math.min(8,budget),errors.length?'hata':'etkinlik');if(budget>=15)add('Seçimini gerekçelendir','Bir kolay soruda bütün şıkları okuyup neden o şıkkı seçtiğini söyle.',10,'test','Kolay')}
  else if(reason==='sure'){add('Takıldığın adımı bul','Hata defterindeki bir soruda zamanı nerede kaybettiğini not et; önce emin olduğun soruları çöz.',Math.min(7,budget),errors.length?'hata':'anlatim');if(budget>=15)add('Kısa test oturumu','Ayırdığın süre boyunca dene. Yetişmezse testi yarım bırakabilir, aynı sıradan devam edebilirsin.',12,'test','Kolay')}
  else if(reason==='bilgi'||score!==null&&score<50||score===null&&!input.known.has(topicKey(target))&&pOf(target)?.status!=='studied'){add('Kısa anlatım ve bir örnek','Temel tanımı oku. Bir çözümlü örneği önce kendin dene, sonra çözümle karşılaştır.',Math.min(12,Math.max(5,Math.ceil(budget*.6))),'anlatim');if(budget>=20)add('Kolay testle yokla','Yanlışını not ederek ilerle; önce %70 düzeyini hedefle.',15,'test','Kolay');else if(budget>=8)add('Bir etkinlikle hatırla','Tek bir etkinlik seçip kavramları kendi cümlelerinle açıklamaya çalış.',5,'etkinlik')}
  else if(score!==null&&score<70){add('Önce hatayı düzelt','Bir yanlış sorunun çözümünü incele, sonra çözümü kapatıp yeniden dene.',Math.min(8,budget),errors.length?'hata':'etkinlik');if(budget>=15)add('Kolay testi tekrar dene','Bu kez zorlandığın adımı özellikle kontrol et.',15,'test','Kolay')}
  else {const level=score!==null&&score>=85?'Zor':score!==null&&score>=70?'Orta':'Kolay';if(budget<15)add('Kısa tekrar','Özeti hatırla ve tek bir etkinlik veya örnek üzerinde çalış.',Math.min(8,budget),target.konu.etkinlik?'etkinlik':'anlatim');else add(target===due?'Kalıcılık denemesi':level+' düzeyde kendini dene','Önerilen seviyede çalış. Süre bir çalışma tahminidir; bitirme zorunluluğu değildir.',15,'test',level)}
  if(budget-reply.steps.reduce((n,s)=>n+s.minutes,0)>=5&&reply.steps.length<3){if(errors.length&&!reply.steps.some(s=>s.action.tur==='hata'))add('Bir yanlışını kapat','Hata defterinden bir soruyu çözümüne bakmadan yeniden çöz.',5,'hata');else if(target.konu.etkinlik&&!reply.steps.some(s=>s.action.tur==='etkinlik'))add('Bir etkinlikle pekiştir','Bir etkinlik seç; cevabını örnek yanıtla karşılaştır.',7,'etkinlik')}
  return reply
}

export type ScheduleProposal = { tasks: StudyTask[]; added: StudyTask[]; moved: { task: StudyTask; from: string; to: string }[]; error: string }
export function proposeCoachSchedule(previous: StudyTask[], steps: CoachStep[], options: { today: string; grades: number[]; dailyMinutes: number; weekdays: number[] }): ScheduleProposal {
  const fail=(error:string):ScheduleProposal=>({tasks:previous,added:[],moved:[],error})
  if(!steps.length)return fail('Eklenecek çalışma adımı yok.')
  const cap=Math.max(0,options.dailyMinutes)
  const editable=(t:StudyTask)=>t.date===options.today&&!t.completed&&t.grade!==undefined&&options.grades.includes(t.grade)&&!!t.topicId&&['study','quiz','review'].includes(t.kind||'')
  const pending=previous.filter(editable),kept=previous.filter(t=>!editable(t))
  const reserved=kept.filter(t=>t.date===options.today).reduce((n,t)=>n+duration(t),0)
  if(reserved+steps.reduce((n,s)=>n+s.minutes,0)>cap)return fail('Tamamlanan ve özel görevlerle birlikte günlük süre aşılacak. Daha kısa süre seç veya programındaki özel görevleri düzenle.')
  const used=new Set<string>(),allIds=new Set(previous.map(t=>t.id))
  const added=steps.map(s=>{const match=pending.find(t=>!used.has(t.id)&&t.grade===s.grade&&t.topicId===`${s.grade}-${s.kod}`&&t.kind===s.kind);if(match)used.add(match.id);let id=match?.id??`coach-${options.today}-${s.id}`;if(!match){let n=2;const base=id;while(allIds.has(id))id=base+'-'+n++;allIds.add(id);}return{id,title:s.title,date:options.today,grade:s.grade,topicId:`${s.grade}-${s.kod}`,kind:s.kind,minutes:s.minutes,completed:false,...(match?.reviewDue?{reviewDue:match.reviewDue}:{})} as StudyTask})
  const tasks=[...kept,...added],moved:ScheduleProposal['moved']=[]
  for(const task of pending.filter(t=>!used.has(t.id))){let placed=false;const base=new Date(options.today+'T12:00:00');for(let i=1;i<=35;i++){const day=new Date(base);day.setDate(day.getDate()+i);if(!options.weekdays.includes((day.getDay()+6)%7))continue;const key=dateKey(day);const occupied=tasks.filter(t=>t.date===key).reduce((n,t)=>n+duration(t),0);if(occupied+duration(task)>cap)continue;tasks.push({...task,date:key});moved.push({task,from:task.date,to:key});placed=true;break}if(!placed)return fail('Kalan görevlere önümüzdeki çalışma günlerinde yer bulunamadı. Programın değiştirilmedi; süre veya çalışma günlerini düzenle.')}
  return {tasks,added,moved,error:''}
}
