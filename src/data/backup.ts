export const PREFIX = 'kimya-kocun-pwa-'
export const LOCAL_ONLY = new Set(['kimya-kocun-pwa-page','kimya-kocun-pwa-ders-gorunum','kimya-kocun-pwa-sync','kimya-kocun-pwa-hesap','kimya-kocun-pwa-ogretmen-sinif','kimya-kocun-pwa-sync-base'])
export type Store = Record<string, string>
export function captureStore(): Store {
  const out: Store = {}
  for (let i=0; i<localStorage.length; i++) { const k=localStorage.key(i); if (k?.startsWith(PREFIX) && !LOCAL_ONLY.has(k)) out[k]=localStorage.getItem(k)! }
  return out
}
export function validateStore(value: unknown): Store {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Yedek biçimi geçersiz.')
  const result: Store = {}
  for (const [key,v] of Object.entries(value)) {
    if (!key.startsWith(PREFIX) || LOCAL_ONLY.has(key) || typeof v !== 'string' || v.length > 20000000) throw Error('Yedekte beklenmeyen kayıt var.')
    try { if (v.startsWith('[') || v.startsWith('{')) JSON.parse(v) } catch { throw Error('Yedekte bozuk kayıt var: ' + key) }
    result[key]=v
  }
  return result
}
export function replaceStore(store: Store) {
  const before=captureStore()
  try {
    for (const k of Object.keys(before)) if (!(k in store)) localStorage.removeItem(k)
    for (const [k,v] of Object.entries(store)) localStorage.setItem(k,v)
  } catch(e) {
    for (const k of Object.keys(captureStore())) if (!(k in before)) localStorage.removeItem(k)
    for (const [k,v] of Object.entries(before)) localStorage.setItem(k,v)
    throw e
  }
}
export function snapshot(store = captureStore()) {
  const key='kk-kocun-safety-snapshots'
  const old=JSON.parse(localStorage.getItem(key) ?? '[]') as {at:string;store:Store}[]
  localStorage.setItem(key,JSON.stringify([{at:new Date().toISOString(),store},...old].slice(0,3)))
}
export function downloadBackup() {
  const body=JSON.stringify({app:'kimya-kocun-pwa',surum:1,guncellendi:new Date().toISOString(),store:captureStore()},null,2)
  const url=URL.createObjectURL(new Blob([body],{type:'application/json'}))
  const a=document.createElement('a'); a.href=url; a.download='kimya-kocun-pwa-yedek-'+new Date().toISOString().slice(0,10)+'.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
}
// Three-way merge: preserve independent edits and propagate deletions against the last shared backup.
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b)
function recordId(x:unknown): string | null {
 if (!x || typeof x !== 'object') return null
 const r=x as Record<string,unknown>
 if (typeof r.id==='string') return r.id
 if (typeof r.key==='string') return r.key
 if (typeof r.grade==='number' && typeof r.kod==='string' && typeof r.no==='number') return r.grade+'|'+r.kod+'|'+r.no
 return null
}
function mergeValue(base:unknown,local:unknown,remote:unknown):unknown {
  if (same(local,remote)) return local
  if (same(local,base)) return remote
  if (same(remote,base)) return local
  if (Array.isArray(local) && Array.isArray(remote) && [...local,...remote].every(v=>recordId(v)!==null)) {
    const b=new Map((Array.isArray(base)?base:[]).map(v=>[recordId(v),v]))
    const l=new Map(local.map(v=>[recordId(v),v])),r=new Map(remote.map(v=>[recordId(v),v]))
    return [...new Set([...b.keys(),...l.keys(),...r.keys()])].flatMap(id=> {
      const v=mergeValue(b.get(id),l.get(id),r.get(id)); return v===undefined?[]:[v]
    })
  }
  if (local && remote && typeof local==='object' && typeof remote==='object' && !Array.isArray(local) && !Array.isArray(remote)) {
    const l=local as Record<string,unknown>,r=remote as Record<string,unknown>,b=(base && typeof base==='object'?base:{}) as Record<string,unknown>
    // A record is kept whole: avoid mixing answer/status fields from incompatible revisions.
    if (recordId(local)) {
      const time=(v:Record<string,unknown>)=>Date.parse(String(v.updatedAt ?? v.completedAt ?? v.tarih ?? v.startedAt ?? '')) || 0
      return time(r)>time(l)?remote:local
    }
    return Object.fromEntries([...new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])].flatMap(k=>{const v=mergeValue(b[k],l[k],r[k]);return v===undefined?[]:[[k,v]]}))
  }
  return local===undefined ? remote : local
}
export function mergeStores(base:Store,local:Store,remote:Store):Store {
 const out:Store={}
 for(const k of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])) {
   if (local[k]===remote[k]) {if(local[k]!==undefined)out[k]=local[k];continue}
   if (local[k]===base[k]) {if(remote[k]!==undefined)out[k]=remote[k];continue}
   if (remote[k]===base[k]) {if(local[k]!==undefined)out[k]=local[k];continue}
   try { const parse=(s:string|undefined)=>s===undefined?undefined:JSON.parse(s); const v=mergeValue(parse(base[k]),parse(local[k]),parse(remote[k]));if(v!==undefined)out[k]=JSON.stringify(v) }
   catch { if(local[k]!==undefined)out[k]=local[k];else if(remote[k]!==undefined)out[k]=remote[k] }
 }
 return out
}
