# Persona Card

Persona Card, online veya yüz yüze danışmanlık görüşmelerinde ihtiyaç halinde kullanılan görsel ifade ve çağrışım kolaylaştırıcı bir kart aracıdır.

## Temel ilke

**Kartlar cevap vermez; konuşmayı kolaylaştırır.**

Kartlara sistem tarafından psikolojik anlam, puan, tanı veya yapay zekâ yorumu atanmaz. Bir kartın ne ifade ettiği danışanın kendi çağrışımı ve görüşme bağlamı içinde ele alınır.

Persona Card bir psikolojik test, ölçek veya tek başına bir seans yöntemi değildir.

## V1.2 ürün modeli

- Danışman hesap açar ve 3 ücretsiz çevrimiçi kart çalışmasıyla ürünü dener.
- Ticari ürün aylık abonelik yerine **yıllık profesyonel lisans** olarak konumlandırılır.
- Aktif yıllık lisans süresince çevrimiçi oturum hizmeti, bakım ve ürünün güncel sürümüne erişim sağlanır.
- Danışan hesap açmaz; yalnızca danışmanın gönderdiği geçici oturum bağlantısından katılır.
- Yıllık lisanslı danışman PWA'yı cihazına kurabilir ve kart galerisini cihaz modunda kullanabilir.
- Çevrimiçi danışan bağlantısı internet gerektirir.

Fiyat ve sözleşme metni kod içine sabitlenmez; ticari lansman öncesinde ayrıca belirlenir.

## Kullanım akışı

1. Danışman giriş yapar.
2. Kart setini seçer.
3. Çevrimiçi oturum oluşturur veya lisansı aktifse cihaz modunda kart galerisini açar.
4. Çevrimiçi oturumda sistem danışana güvenli bir bağlantı üretir.
5. Danışan üyelik açmadan bağlantıdan katılır ve kartlarını seçer.
6. Danışman seçimleri eş zamanlı görür.
7. Seçim sırası korunur.
8. Danışman oturumu kapatabilir veya seçimleri sıfırlayabilir.

## Güvenli danışan bağlantısı

V1.2'de gizli danışan katılım tokenı URL query parametresinde taşınmaz. Yeni davet bağlantısı `#room=...&token=...` fragment biçimindedir.

- URL fragment HTTP request path/query ile sunucuya gönderilmez.
- Sayfa açıldığında token aynı sekmenin `sessionStorage` alanına alınır.
- Token adres çubuğundan hemen temizlenir; yalnız oda kodu görünür kalır.
- Eski `?room=...&token=...` query linkleri davet olarak kabul edilmez.
- Aynı sekmedeki kısa süreli reconnect desteklenir.

## PWA ve çevrimdışı hazırlık

V1.2 ile `manifest.webmanifest` ve `service-worker.js` eklenmiştir. Destekleyen tarayıcılarda Persona Card ana ekrana/masaüstüne kurulabilir.

Aktif yıllık lisanslı danışman iki kart setindeki toplam 121 kartı cihaz önbelleğine indirebilir. Cihaz modu bu kartlarla yerel çalışır; realtime danışan bağlantısı çevrimiçi hizmettir.

## Kart setleri

- `personita`: 77 kart
- `terapi_sb`: 44 siyah-beyaz kart

## Teknik yapı

- Frontend: statik HTML/CSS/JavaScript + PWA
- Realtime: Socket.IO
- Backend: `efaher/terapikart-backend`
- Hesap ve lisans durumu: backend + PostgreSQL
- Geliştirme dalı: `v1.2-annual-license-pwa`

## Ürün prensibi gereği bulunmayanlar

- Kartlara otomatik anlam atama
- Yapay zekâ ile kart yorumlama
- Puanlama / ölçek sonucu
- Tanı önerisi
- Danışan terapi notu veya psikolojik profil kaydı

## Ticari yayın öncesi zorunlu işler

- Kart görsellerinin dijital/ticari kullanım haklarının kesinleştirilmesi
- KVKK ve gizlilik metinlerinin hazırlanması
- Kullanım/lisans ve hizmet taahhüdü sözleşmesinin hazırlanması
- Yıllık lisans ödeme ve yenileme akışının bağlanması
- Production PostgreSQL ve yedek/geri yükleme planının doğrulanması
- Offline cihaz modu lisans yetkisinin imzalı entitlement ile sertleştirilmesi
- `efia.net.tr` altında üretim alan adının kurulması
