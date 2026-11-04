# Kimya Koçum — öğrenci sürümü

Bu kopya masaüstündeki projeden ayrı hazırlanmıştır. Özgün dosyalar değiştirilmemiştir. Yayınlama veya GitHub işlemi yapılmamıştır.

## Açmak için

Bu klasörde `npm run dev` çalıştırın, ardından http://localhost:5183/ adresini açın. Bu bilgisayarda bağımlılıklar hazırdır. Başka bilgisayara taşırken önce `npm ci` gerekir.

Üretim önizlemesi: `npm run build` ardından `npm run preview -- --port 5183`. Çevrimdışı çalışma üretim önizlemesinde denenmelidir; geliştirme modunda servis çalışanı kaydolmaz.

## Yapılanlar

- Öğrenci ana ekranı: sıradaki konu, günlük görevler, son beş test ortalaması, konu ilerlemesi, hata defteri ve hedef.
- Ana ekrandan ve program görevlerinden doğrudan konu/test geçişi.
- Tarama ile bilinen konuların kilitlerden muaf tutulması; eksik soru paketinde taramanın durdurulması.
- Yazılı kapsamı ve sınav bileşenlerindeki mevcut tür uyumsuzluklarının düzeltilmesi.
- Normal test ve taramada cihazda taslak kaydı, aynı çalışmaya geri dönme.
- Günlük toplam süreyi gözeten tekrar planı, görev silmede geri alma.
- İlerlemeyi koruyarak sınıf değiştirme.
- Google hesabı gerektirmeyen JSON yedek indirme ve onaylı geri yükleme. Geri yüklemeden önce mevcut yedek indirilir.
- Drive yedeklerinde son ortak kayıt üzerinden üç yönlü birleştirme, kimlikli kayıtları koruma, hesapların yerel verilerini ayırma ve hatalı hesap geçişinde geri dönüş.
- Çevrimdışı ders paketi indirme; üretim derlemesinde tüm uygulama ekranlarının kodunu önbelleğe alma.
- Ortak renkler, kartlar, daha geniş dokunma alanları ve mobil yerleşim.

## Kontroller

`npm test` işleyiş kontrollerini çalıştırır. `npm run build` TypeScript kontrolü ve üretim derlemesini yapar.

Tarayıcıda öğrenci başlangıcı, mobil ve masaüstü ana ekranı, doğrudan konu açma, test cevabının kapanıp açıldıktan sonra korunması ve Gelişimim ekranı kontrol edilmiştir.

## Yayından önce kalan doğrulamalar

- Google OAuth ve Drive bağlantısı gerçek hesapla denenmedi. 5183 adresinin Google istemcisinde yetkili köken olarak tanımlı olması gerekebilir. Bu yapılandırma değiştirilmedi.
- Gerçek iki cihazda eşzamanlı Drive yazımları ve oturum yenileme denenmelidir. Birleştirme tek başına sunucu tarafında atomik eşzamanlılık garantisi sağlamaz.
- Mobil cihazda kurulum ve gerçek internet kesintisiyle PWA uçtan uca denenmelidir. PDF dosyaları ders paketine dahil değildir; ayrıca indirilir.
- Ders içerikleri korunmuştur; 12. sınıfın hazır olmayan içeriği eklenmemiştir. Kimya sorularının doğruluğu tek tek yeniden denetlenmemiştir.

GitHub Pages için üretim derlemesinde BASE_PATH=/kimya-kocum/ kullanılmalıdır.
