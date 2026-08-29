# Persona Card V1.2 — Production Öncesi Güvenlik İncelemesi

Bu belge 2026-08-29 tarihli V1.2 staging pilotu sonrasında production öncesi kalan güvenlik işlerini sınıflandırır.

## Tamamlanan kontroller

- danışman ve danışan rolleri backend tarafından ayrılıyor
- danışman kart seçemiyor; danışan oturumu sıfırlayamıyor/kapatamıyor
- oda ve katılım tokenları kriptografik rastgele üretiliyor
- yıllık lisans ve ücretsiz kullanım backend tarafından uygulanıyor
- `ADMIN_LICENSE_SECRET` frontend'e yazılmıyor
- PostgreSQL kalıcılığı restart sonrası doğrulandı
- production frontend yanlış/legacy backend'e bağlanırsa build fail-closed duruyor
- frontend `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` ve temel Permissions Policy ile yayınlanıyor
- `runtime-config.js` production backend değişikliklerinde stale cache riskini azaltmak için `no-store`
- auth/admin endpointleri bağımlılıksız rate-limit middleware ile korunuyor; limit aşımı `429 RATE_LIMITED` + `Retry-After` döndürüyor
- Render üzerinde gerçek istemci IP'si için Cloudflare tarafından yazılan `CF-Connecting-IP` öncelikli kullanılıyor; `X-Forwarded-For` yalnız fallback
- login/register için IP tabanlı ortak limit; login için e-posta içeren ayrı limit; admin lisans endpointi için ayrı limit bulunuyor
- staging login endpointinde sahte test hesabıyla 10 hatalı giriş `401`, 11. istek `429 Too Many Requests` döndürdü; rate-limit gerçek Render staging üzerinde doğrulandı (2026-08-29)
- danışan davet secret'ı query parametresinden URL fragment'a taşındı
- fragment içindeki token sayfa açılışında `sessionStorage`'a alınıp adres çubuğundan hemen temizleniyor; aynı sekmede reconnect destekleniyor
- CI, danışan tokenının yeniden query parametresine taşınmasını statik guard ile engelliyor
- staging deploy preview'da yeni fragment linki açıldı, gizli token adres çubuğundan temizlendi ve danışanın seçtiği kart danışman ekranına realtime ulaştı (2026-08-29)
- aktif yıllık lisans için backend tarafından en fazla 30 günlük Ed25519 imzalı çevrimdışı entitlement üretiliyor
- frontend entitlement imzasını Web Crypto ile doğruluyor; `plan=annual` localStorage kaydı tek başına cihaz modunu açamıyor
- staging hesabında imzalı çevrimdışı yetkinin `29.09.2026` tarihine kadar geçerli göründüğü, internet tamamen kapatıldıktan sonra cihaz modunun açıldığı ve kart seçiminin çalıştığı gerçek cihazda doğrulandı (2026-08-29)
- `license_events`, `ADMIN_LICENSE_SECRET` ile korunan salt-okunur `/api/admin/licenses/events` endpointinden danışman e-postasıyla sorgulanabiliyor; yalnız public danışman alanları ve audit olayları dönüyor
- audit endpointi için yanlış secret `401`, doğru secret ile aktivasyon/yenileme event sırası entegrasyon testinde doğrulandı
- Socket.IO client üçüncü taraf CDN'den kaldırıldı; frontend build sırasında sabit `socket.io-client@4.7.2` paketinden `vendor/socket.io.min.js` üretiliyor ve PWA shell içinde yerel olarak cache'leniyor
- CI, `cdn.socket.io` kullanımının tekrar eklenmesini ve vendor dosyasının üretilmemesini engelliyor
- hesap doğrulama ve şifre sıfırlama tokenları kriptografik rastgele üretiliyor; veritabanında yalnız SHA-256 hashleri tutuluyor
- e-posta doğrulama tokenı 24 saat, şifre sıfırlama tokenı 60 dakika geçerli ve tek kullanımlı
- yeni token üretildiğinde aynı amaçlı önceki kullanılmamış token geçersizleştiriliyor
- şifre sıfırlandığında `auth_version` artırılıyor; eski oturum tokenları artık hesapla eşleşmiyor
- şifre sıfırlama talebi, hesap var/yok bilgisini dışarı sızdırmayan genel yanıt kullanıyor
- hesap güvenliği frontend modülü doğrulama/reset tokenlarını URL fragmentından alıp adres çubuğundan anında temizliyor
- SMTP/mail hizmeti yapılandırılmadığında staging akışı değişmiyor; `REQUIRE_EMAIL_VERIFICATION=false` ile mevcut pilot kullanımı korunuyor

## P0 — Ticari production öncesi tamamlanmalı

### 1. Kimlik doğrulama rate limit — STAGING DOĞRULANDI

Uygulanan varsayılanlar:
- auth IP ortak pencere: 15 dakika / 60 istek
- login IP+e-posta: 15 dakika / 10 istek
- register IP: 15 dakika / 8 istek
- admin lisans IP: 15 dakika / 10 istek
- limit aşımında genel `429 RATE_LIMITED`, `Retry-After` ve rate-limit response headerları
- değerler environment variable ile değiştirilebilir

Kod ve otomatik middleware testi başarılıdır. Gerçek Render staging login endpointinde sahte test e-postasıyla yapılan kontrollü smoke testte ilk 10 hatalı giriş `401`, 11. istek `429 Too Many Requests` döndürdü. P0/1 kabul edildi.

### 2. Danışan oturum tokenını URL query'den çıkar — STAGING REALTIME DOĞRULANDI

Yeni danışan linki:
- `room` ve gizli `token` URL fragment (`#room=...&token=...`) içinde oluşturulur
- fragment HTTP request path/query ile sunucuya gönderilmez
- sayfa açıldığında token yalnız aynı sekmenin `sessionStorage` alanına alınır
- adres çubuğu `#room=...` biçimine scrub edilir; token görünür URL'den kaldırılır
- eski `?room=...&token=...` query linkleri yeni frontend tarafından davet olarak okunmaz
- mevcut 6 saatlik backend oda süresi değişmedi

Kod ve CI guard başarılıdır. Staging deploy preview'da gerçek cihazda token scrub ve yeni fragment linki üzerinden realtime kart seçiminin danışman ekranına ulaştığı doğrulandı (2026-08-29). P0/2 kabul edildi.

### 3. Production PostgreSQL + backup/restore

Ücretsiz staging PostgreSQL production olarak kullanılmamalı. Ücretli production DB kurulmalı ve gerçek restore tatbikatı yapılmalı.

Kabul ölçütü:
- `/health` → `persistentAccounts: true`
- restart sonrası hesap/lisans kalıcılığı
- yedek oluşturma
- ayrı DB'ye restore
- `advisors` ve `license_events` doğrulaması

### 4. Offline lisans yetkisini sertleştir — STAGING + INTERNET-OFF DOĞRULANDI

Uygulanan model:
- backend aktif yıllık lisans için en fazla 30 günlük imzalı offline entitlement üretir
- entitlement geçerliliği yıllık lisans bitiş tarihini aşamaz
- imza Ed25519 ile üretilir; private key backend dışında paylaşılmaz
- frontend Web Crypto ile public key üzerinden imzayı doğrular
- entitlement danışman hesap ID'sine bağlıdır
- geçerli entitlement yoksa cihaz modu ve kartların cihaza hazırlanması güvenlik guard'ı tarafından engellenir
- tarayıcıdaki `plan=annual` alanını elle değiştirmek tek başına cihaz modunu açmaz
- public doğrulama anahtarı ayrı CacheStorage alanında tutulur

Staging gerçek cihaz doğrulaması: imzalı cihaz yetkisi `29.09.2026` tarihine kadar geçerli göründü; internet tamamen kapatıldıktan sonra cihaz modu açıldı ve kart seçimi çalıştı. P0/4 kabul edildi.

## P1 — İlk ücretli kullanıcıdan önce güçlü biçimde önerilir

### 5. E-posta doğrulama — KOD + CI TAMAMLANDI, GERÇEK E-POSTA TESTİ BEKLİYOR

Uygulanan model:
- backend sağlayıcıdan bağımsız SMTP katmanı kullanır
- doğrulama tokenı 32-byte rastgele üretilir ve veritabanında yalnız SHA-256 hash olarak saklanır
- token 24 saatlik ve tek kullanımlıdır
- doğrulama bağlantısı `#verify-email=...` fragmentı kullanır; frontend tokenı görünür URL'den anında temizler
- `publicAdvisor` yalnız `emailVerified` boolean alanını dışarı verir
- production'da istenirse `REQUIRE_EMAIL_VERIFICATION=true` ile online/cihaz özellikleri doğrulama tamamlanana kadar engellenebilir
- staging'de bu bayrak varsayılan olarak kapalıdır

Kalan kabul: gerçek SMTP bilgileri tanımlandıktan sonra bir doğrulama e-postasının teslimi ve bağlantının gerçek tarayıcıda tek kullanımlı çalışması doğrulanacak.

### 6. Şifre sıfırlama — KOD + CI TAMAMLANDI, GERÇEK E-POSTA TESTİ BEKLİYOR

Uygulanan model:
- reset talebi hesap var/yok bilgisini dışarı sızdırmayan genel mesaj döndürür
- reset tokenı veritabanında yalnız hash olarak tutulur; 60 dakika geçerli ve tek kullanımlıdır
- bağlantı `#reset-password=...` fragmentı kullanır ve token adres çubuğundan hemen temizlenir
- frontend yeni şifreyi iki kez ister
- başarılı reset sonrası `auth_version` artar; daha önce verilmiş auth tokenları geçersiz kalır
- şifreler yine `scrypt` ile hashlenir

Kalan kabul: gerçek SMTP ile reset e-postası teslimi, yeni şifreyle giriş ve eski şifrenin reddi staging'de smoke test edilecek.

### 7. Admin lisans hareketlerini okunabilir hale getir — KOD + ENTEGRASYON TESTİ TAMAMLANDI

- `GET /api/admin/licenses/events?email=...&limit=...`
- `ADMIN_LICENSE_SECRET` olmadan erişilemez
- admin rate-limit katmanından geçer
- e-posta doğrulanır, bulunmayan hesap `404` döndürür
- en fazla 100 event döndürür
- yalnız `publicAdvisor` alanları ile `license_events` audit verisi döner; password salt/hash dönmez
- yanlış secret ve iki ardışık yıllık lisans olayı entegrasyon testinde doğrulandı
- `npm run license:events -- danisman@example.com 20` komutu operasyonel sorgu için eklendi

Staging üzerinde gerçek admin query smoke testi isteğe bağlı son operasyonel doğrulamadır.

### 8. Socket.IO frontend bağımlılığını yerelleştir — BUILD + CI TAMAMLANDI

- üçüncü taraf `cdn.socket.io` script etiketi kaldırıldı
- frontend `socket.io-client` sürümünü `4.7.2` olarak sabitler
- Netlify build sırasında `vendor/socket.io.min.js` yerel asset olarak üretilir
- PWA service worker yerel vendor dosyasını shell cache'e alır
- CI vendor dosyasını üretir ve CDN referansının geri gelmesini engeller
- güncel Deploy Preview başarıyla yayımlandı

Normal çevrimiçi oturum smoke testi, deployment sonrası son kullanıcı doğrulamasıdır.

## P2 — Sonraki sertleştirme

- Content Security Policy'yi production domainleri kesinleşince dar allowlist ile etkinleştir
- auth ve admin güvenlik olaylarını minimum kişisel veriyle logla
- dependency update/Dependabot süreci kuruldu; açılan PR'lar otomatik merge edilmez
- secret rotation prosedürü yaz
- rate-limit state'i birden fazla backend instance kullanılacaksa ortak store'a taşı
- periyodik backup restore tatbikatı ve olay müdahale kontrol listesi oluştur

## Merge kararı

Staging pilotu kabul edilmiştir. P0/1, P0/2 ve P0/4 gerçek staging/cihaz koşullarında doğrulandı ve kabul edildi. P1/5, P1/6, P1/7 ve P1/8 kod/CI düzeyinde tamamlandı. E-posta doğrulama ve şifre sıfırlamada yalnız gerçek SMTP teslim/smoke testi bekliyor. Ana ücretli teknik production blokajı P0/3 olan ayrı production PostgreSQL + gerçek backup/restore kurulumudur.
