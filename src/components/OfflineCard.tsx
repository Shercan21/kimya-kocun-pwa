import { useEffect, useState } from 'react'
import Icon from './Icon'
export default function OfflineCard({grades}:{grades:number[]}) {
 const [online,setOnline]=useState(navigator.onLine),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const [ready,setReady]=useState(()=>grades.every(g=>localStorage.getItem('kk-kocun-offline:'+g)))
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
 async function prepare() {
  setBusy(true);setMessage('Ders paketlerin indiriliyor…')
  try {
   if(!('caches' in window))throw Error('Önbellek bu tarayıcıda kullanılamıyor.')
   const cache=await caches.open('kimya-kocun-pwa-v5')
   for(const grade of grades) {
    for(const file of ['konular.json','testler.json','etkinlikler.json','yazili.json','anlatim-detay.json']) {
     const url=import.meta.env.BASE_URL+'icerik/'+grade+'/'+file
     const response=await fetch(url);if(!response.ok)throw Error('Paket indirilemedi; tekrar dene.')
     const text=await response.clone().text();const data:unknown=JSON.parse(text)
     await cache.put(url,response)
     const strings:string[]=[]
     const visit=(v:unknown):void=>{if(typeof v==='string')strings.push(v);else if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')Object.values(v).forEach(visit)}
     visit(data)
     const images=new Set(strings.flatMap(v=>[...v.matchAll(/src=["'](?:[^"']*?\/icerik\/)?(img\/[^"'<> ]+)/g)].map(m=>m[1])))
     for(const image of images){const imageUrl=import.meta.env.BASE_URL+'icerik/'+image;const r=await fetch(imageUrl);if(!r.ok)throw Error('Bir ders görseli indirilemedi. Tekrar dene.');await cache.put(imageUrl,r)}
    }
    localStorage.setItem('kk-kocun-offline:'+grade,new Date().toISOString())
   }
   setReady(true);setMessage('Ders metinleri, testler ve etkinlikler bu cihazda hazır. PDF dosyalarını ayrıca indir. Uygulamayı kapatmadan önce ilk yüklemenin tamamlanmasını bekle.')
  }catch(e){setMessage(e instanceof Error?e.message:'İndirme tamamlanamadı.')}finally{setBusy(false)}
 }
 return <section className="card"><h3 className="card-title"><Icon name="book"/>İnternetsiz çalış</h3><p className="muted">{online?'İnternete bağlısın. Ders paketini önceden indirerek bağlantın yokken de çalışabilirsin.':'Şu an çevrimdışısın. Önceden indirdiğin içerikleri kullanabilirsin.'}</p><span className={'offline-badge '+(ready?'ready':'')}>{ready?'Ders paketi daha önce indirildi':'Ders paketi henüz indirilmedi'}</span><button className="btn-secondary" disabled={!online||busy} onClick={()=>void prepare()}>{busy?'İndiriliyor…':ready?'Ders paketini güncelle':'Ders paketini indir'}</button>{message&&<p className="small" role="status">{message}</p>}<p className="muted small">Tarayıcı verileri temizlenirse paketleri yeniden indirmen gerekir.</p></section>
}


