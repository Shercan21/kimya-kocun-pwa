# Kimya Koçun

9–11. sınıf ve TYT/AYT çalışmaları için kurulabilir PWA. Kimya Koçum'dan ayrı bir projedir.

## Yerel test

`npm ci`, ardından `npm run dev`: http://localhost:5183/

`npm test` ile kontrolleri, `npm run build` ile üretim derlemesini çalıştırın.
`npm run preview -- --port 5183` ile PWA sürümünü deneyin.

75 uzun ve şekilli anlatım, kısa özetler, 197 SVG çizim, 3.848 test sorusu, etkinlikler, yazılılar, dokuz PDF kitap, öğrenci önizlemesi, plan ve hata defteri içerir. 12. sınıfın hazır anlatım/test paketi kaynak projede bulunmaz; kendi konularını ekleme alanı korunmuştur.

## Ayrı uygulama

Görünen ad: Kimya Koçun. Yerel kayıtlar, Drive yedek dosyası, çevrimdışı önbellek ve sayaç yol adı eski uygulamadan ayrıdır. Sayaç aynı GoatCounter hesabında kimya-kocun-pwa/ yolunu kullanır. Yerel önizleme ziyaretleri sayılmaz.

## Yayınlama

GitHub Actions akışı yalnızca elle başlatılır. Kod gönderilince otomatik yayın yapılmaz. Öğrenci testi tamamlandıktan sonra Pages kaynağı GitHub Actions seçilip yayın akışı çalıştırılır. BASE_PATH=/kimya-kocun-pwa/ ayarlıdır.

## Kontrol sınırları

Google OAuth/Drive gerçek hesap ve iki cihazla denenmedi. Yeni adresin Google OAuth istemcisinde yetkili köken olarak tanımlanması gerekebilir. İçerik dosyaları korunmuştur; bilimsel doğrulukları tek tek yeniden denetlenmemiştir.
