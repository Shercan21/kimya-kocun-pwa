// Telefonun geri tuşu: uygulamadan çıkmak yerine bir önceki ekrana döner.
// Bir ekran (konu, test, hata defteri, pencere…) açılınca tarayıcı geçmişine
// bir adım eklenir; geri tuşu en son açılanı kapatır. Ana sayfada geri tuşu
// her zamanki gibi uygulamadan çıkar.

import { useEffect, useRef, useState } from 'react'

type Entry = { id: number; fn: () => void }
const stack: Entry[] = []
let seq = 0
let ignore = 0

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignore > 0) {
      ignore--
      return
    }
    stack.pop()?.fn()
  })
}

// Geri adımı ekler; dönen fonksiyon, ekran uygulama içinden kapatılınca
// geçmişteki adımı da geri alır.
function pushBack(fn: () => void): () => void {
  const id = ++seq
  stack.push({ id, fn })
  window.history.pushState({ kimyaKocum: id }, '')
  return () => {
    const i = stack.findIndex(e => e.id === id)
    if (i < 0) return
    stack.splice(i, 1)
    ignore++
    window.history.back()
  }
}

// active true olduğu sürece geri tuşu onBack'i çağırır. onBack çağrıldıktan
// sonra ekran hâlâ açıksa (ör. çok adımlı akışta bir önceki adım) yeni bir
// geri adımı eklenir.
export function useBackStep(active: boolean, onBack: () => void) {
  const ref = useRef(onBack)
  const [gen, setGen] = useState(0)
  useEffect(() => {
    ref.current = onBack
  })
  useEffect(() => {
    if (!active) return
    let released = false
    const release = pushBack(() => {
      released = true
      ref.current()
      setGen(g => g + 1)
    })
    return () => {
      if (!released) release()
    }
  }, [active, gen])
}
