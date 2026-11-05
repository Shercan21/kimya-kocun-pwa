import { useEffect, useRef, useState } from 'react'
import { icerikHtml } from '../data/content'
import { useBackStep } from '../data/backNav'


export default function QuestionContent({ html }: { html: string }) {
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null)
  const [actualSize, setActualSize] = useState(false)
  const content = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useBackStep(!!image, () => setImage(null))
  useEffect(() => {
    content.current?.querySelectorAll('img').forEach(img => {
      img.tabIndex = 0
      img.setAttribute('role', 'button')
      img.setAttribute('aria-label', (img.alt || 'Soru görseli') + ' — büyüt')
      img.setAttribute('aria-haspopup', 'dialog')
    })
  }, [html])
  useEffect(() => {
    if (image && !dialog.current?.open) dialog.current?.showModal()
    else if (!image && dialog.current?.open) dialog.current.close()
  }, [image])
  function open(target: EventTarget | null) {
    if (!(target instanceof HTMLImageElement)) return
    setActualSize(false)
    setImage({ src: target.currentSrc || target.src, alt: target.alt || 'Soru görseli' })
  }
  return <>
    <div ref={content} className="soru-metni question-content" dangerouslySetInnerHTML={{ __html: icerikHtml(html) }}
      onClick={e => open(e.target)} onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof HTMLImageElement) { e.preventDefault(); open(e.target) }
      }} />
    <dialog ref={dialog} className="question-image-dialog" aria-label="Soru görseli" onCancel={() => setImage(null)} onClose={() => setImage(null)} onClick={e => { if (e.target === e.currentTarget) setImage(null) }}>
      <div className="image-dialog-toolbar"><b>Görseli incele</b><button type="button" className="btn-secondary" onClick={() => setActualSize(v => !v)}>{actualSize ? 'Ekrana sığdır' : 'Gerçek boyut'}</button><button type="button" className="btn-ghost" aria-label="Görseli kapat" onClick={() => setImage(null)}>×</button></div>
      <div className={actualSize ? 'question-image-scroll is-actual' : 'question-image-scroll'}>{image && <img src={image.src} alt={image.alt} />}</div>
    </dialog>
  </>
}

