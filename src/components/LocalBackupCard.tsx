import { useRef, useState } from 'react'
import Icon from './Icon'
import { captureStore, downloadBackup, replaceStore, snapshot, validateStore, type Store } from '../data/backup'
export default function LocalBackupCard() {
 const input=useRef<HTMLInputElement>(null)
 const [pending,setPending]=useState<Store|null>(null),[error,setError]=useState('')
 async function read(file?:File) {
  if(!file)return
  setError('')
  try {if(file.size>25000000)throw Error('Dosya çok büyük.'); const data=JSON.parse(await file.text());if(data.surum!==1 || !data.store)throw Error('Desteklenmeyen yedek dosyası.');const store=validateStore(data.store);if(!Object.keys(store).length)throw Error('Yedek dosyası boş.');setPending(store)} catch(e){setError(e instanceof Error?e.message:'Yedek okunamadı.')}
 }
 return <section className="card"><h3 className="card-title"><Icon name="cloud"/>Yedeğin sende kalsın</h3><p className="muted">Google hesabı gerektirmeden ilerlemeni bir dosyaya kaydet. İstediğin zaman bu cihazda geri yükleyebilirsin.</p><div className="row-actions start"><button className="btn-secondary" onClick={downloadBackup}>Yedeği indir</button><button className="btn-ghost" onClick={()=>input.current?.click()}>Dosyadan geri yükle</button></div><input ref={input} type="file" accept=".json,application/json" hidden onChange={e=>void read(e.target.files?.[0])}/>{error&&<p className="form-error" role="alert">{error}</p>}{pending&&<div className="delete-box" role="alert"><b>Bu cihazdaki kayıtlar dosyadaki yedekle değiştirilecek.</b><p className="small">Önce mevcut kayıtlarının bir kopyası indirilecek. Devam etmeden önce dosyayı güvenli bir yerde sakla.</p><div className="row-actions"><button className="btn-secondary" onClick={()=>setPending(null)}>Vazgeç</button><button className="primary-button" onClick={()=>{try{downloadBackup();snapshot(captureStore());replaceStore(pending);localStorage.removeItem('kimya-kocun-pwa-sync-base');window.location.reload()}catch{setError('Geri yükleme tamamlanamadı. Cihazında boş alan olduğundan emin ol.')}}}>Yedekle ve geri yükle</button></div></div>}</section>
}
