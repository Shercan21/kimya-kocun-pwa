import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startCloud } from './data/cloud'

// Hesaptan başka cihazın verisi geldiyse uygulama yeni veriyle yeniden açılır.
startCloud(() => window.location.reload())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker yalnızca derlenmiş sürümde (npm run build / preview)
// çalışır; geliştirme sırasında eski dosyaların önbellekte kalmasını önler.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Kayıt başarısız olsa da uygulama normal çalışmaya devam eder.
    })
  })
}
