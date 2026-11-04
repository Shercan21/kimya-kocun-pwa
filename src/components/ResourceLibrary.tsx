import { useState } from 'react'
import Icon from './Icon'
export default function ResourceLibrary({grades}:{grades:number[]}) {
 const [open,setOpen]=useState(false)
 return <section className="card resource-library"><div className="resource-heading"><div><h3 className="card-title"><Icon name="book"/>Ders kitapların ve çalışma dosyaların</h3><p className="muted small">Uzun ve şekilli konu anlatımları, etkinlik kitapları ve soru bankaları.</p></div><button className="btn-secondary" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Kitapları gizle':'Kitapları göster'}</button></div>{open&&<div className="resource-grid">{grades.map(g=><div key={g}><h4>{g}. sınıf</h4>{g===12?<p className="muted small">Asıl projede 12. sınıfa ait hazır kitap bulunmuyor. TYT/AYT için 9–11. sınıf kitaplarını kullanabilirsin.</p>:<ul>{[['konu-anlatimi','Şekilli konu anlatımı'],['etkinlik-kitabi','Etkinlik kitabı'],['soru-bankasi','Soru bankası']].map(([file,label])=><li key={file}><a href={import.meta.env.BASE_URL+'kitaplar/Kimya-Kocum-'+g+'-sinif-'+file+'.pdf'} target="_blank" rel="noopener noreferrer">{label} <span>PDF ↗</span></a></li>)}</ul>}</div>)}</div>}</section>
}
