const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(path,mocks={}) {const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:n=>{if(n in mocks)return mocks[n];throw Error('Unmocked '+n)},localStorage:storage,crypto:require('node:crypto').webcrypto,console,Date,Set,Map,JSON});return module.exports}
const values=new Map();const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),key:i=>[...values.keys()][i],get length(){return values.size}};
const {mergeStores,validateStore,replaceStore,captureStore}=load('src/data/backup.ts');
let passed=0;function test(name,fn){fn();console.log('OK '+name);passed++}
const key='kimya-kocun-pwa-test-sonuclari-v1', encode=x=>({[key]:JSON.stringify(x)}),decode=x=>JSON.parse(x[key]);
test('Two devices retain independent test results',()=>{const r=decode(mergeStores(encode([{id:'a'}]),encode([{id:'a'},{id:'b'}]),encode([{id:'a'},{id:'c'}])));assert.deepEqual(new Set(r.map(x=>x.id)),new Set(['a','b','c']))});
test('Deletion propagates against shared baseline',()=>assert.equal(decode(mergeStores(encode([{id:'a'},{id:'b'}]),encode([{id:'b'}]),encode([{id:'a'},{id:'b'},{id:'c'}]))).some(x=>x.id==='a'),false));
test('Latest dated learning record wins as a whole',()=>{const base=encode([{id:'a',updatedAt:'2026-01-01',status:'studied'}]);const local=encode([{id:'a',updatedAt:'2026-01-02',status:'learned'}]);const remote=encode([{id:'a',updatedAt:'2026-01-03',status:'permanent'}]);assert.equal(decode(mergeStores(base,local,remote))[0].status,'permanent')});
test('New device restores remote profile',()=>assert.equal(mergeStores({}, {}, {'kimya-kocun-pwa-profile-v1':'{"grade":9}'})['kimya-kocun-pwa-profile-v1'],'{"grade":9}'));
test('Backup rejects account identity and unrelated storage',()=>{assert.throws(()=>validateStore({'kimya-kocun-pwa-hesap':'{}'}));assert.throws(()=>validateStore({'unrelated':'secret'}))});
test('Restore replaces app progress without touching other apps',()=>{storage.setItem('unrelated','keep');storage.setItem('kimya-kocun-pwa-old','old');replaceStore({'kimya-kocun-pwa-new':'new'});assert.equal(storage.getItem('unrelated'),'keep');assert.equal(storage.getItem('kimya-kocun-pwa-old'),null);assert.equal(captureStore()['kimya-kocun-pwa-new'],'new')});
const contents=[{konu:{kod:'A'}},{konu:{kod:'B'}},{konu:{kod:'C'}}];
const locks=load('src/data/locks.ts',{'./content':{konuId:(g,k)=>g+'-'+k,tumKonular:()=>contents},'./learningProgress':{loadLearningProgress:()=>[]}});
test('Screening-known topic remains accessible',()=>{const l=locks.kilitliKonular([9],new Set(['9|B']));assert.equal(l.has('9|B'),false);assert.equal(l.has('9|C'),true)});
test('Known prerequisite releases the next topic',()=>assert.equal(locks.kilitliKonular([9],new Set(['9|A'])).has('9|B'),false));
const planner=load('src/data/planner.ts',{'./studyTasks':{localDate:d=>d.toISOString().slice(0,10)}});
const options={grades:[9],days:[{key:'2026-11-04',weekday:2},{key:'2026-11-05',weekday:3}],studyWeekdays:[2,3],dailyMinutes:20,today:'2026-11-04',tasks:[{id:'done',date:'2026-11-04',grade:9,completed:true,minutes:15}],topics:[{id:'one',grade:9,title:'Atom',status:'learned',learnedAt:'2026-11-03T12:00:00Z'},{id:'two',grade:9,title:'Mol',status:'learned',learnedAt:'2026-11-03T12:00:00Z'}]};
test('Review planning respects completed work and daily capacity',()=>{const r=planner.planWeek(options);for(const d of options.days){const used=r.filter(t=>t.date===d.key).reduce((s,t)=>s+t.minutes,0)+options.tasks.filter(t=>t.date===d.key).reduce((s,t)=>s+t.minutes,0);assert.ok(used<=20)}});
test('Review moves to the next day with available time',()=>assert.equal(planner.planWeek(options)[0].date,'2026-11-05'));
test('Already scheduled review is not planned again next week',()=>{const r=planner.planWeek({...options,tasks:[{id:'old',date:'2026-11-04',grade:9,kind:'review',topicId:'one',reviewDue:'2026-11-04',completed:true,minutes:10}],topics:[options.topics[0]]});assert.equal(r.some(x=>x.topicId==='one'&&x.reviewDue==='2026-11-04'),false)});
test('Every curriculum topic has a detailed illustrated lesson',()=>{const m=JSON.parse(fs.readFileSync('src/data/mufredat.json','utf8'));for(const [g,d] of Object.entries(m)){const details=JSON.parse(fs.readFileSync('public/icerik/'+g+'/anlatim-detay.json','utf8'));for(const t of d.temalar)for(const b of t.bolumler)for(const k of b.konular)assert.ok(details[k.kod]?.length>100,k.kod+' missing detailed lesson')}});
test('All nine original study books are accessible',()=>{for(const g of [9,10,11])for(const kind of ['konu-anlatimi','etkinlik-kitabi','soru-bankasi'])assert.ok(fs.existsSync('public/kitaplar/Kimya-Kocum-'+g+'-sinif-'+kind+'.pdf'))});
console.log(passed+' checks passed');

const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
assert.equal(manifest.name,'Kimya Koçun');
assert.equal(manifest.short_name,'Kimya Koçun');
assert.equal(manifest.id,'/kimya-kocun-pwa/');
assert.notEqual(new URL(manifest.id,'https://shercan21.github.io/').href,'https://shercan21.github.io/');
console.log('OK App display name and separate installation identity');
