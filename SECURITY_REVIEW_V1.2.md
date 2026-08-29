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
- danışan davet secret'ı query parametresinden URL fragment'a taşındı
- fragment içindeki token sayfa açılışında `sessionStorage`'a alınıp adres çubuğundan hemen temizleniyor; aynı sekmede reconnect destekleniyor
- CI, danışan tokenının yeniden query parametresine taşınmasını statik guard ile engelliyor
- staging deploy preview'da yeni fragment linki açıldı ve gizli tokenın adres çubuğundan temizlendiği gerçek cihazda doğrulandı (2026-08-29)

## P0 — Ticari production öncesi tamamlanmalı

### 1. Kimlik doğrulama rate limit — KOD TAMAMLANDI

Uygulanan varsayılanlar:
- auth IP ortak pencere: 15 dakika / 60 istek
- login IP+e-posta: 15 dakika / 10 istek
- register IP: 15 dakika / 8 istek
- admin lisans IP: 15 dakika / 10 istek
- limit aşımında genel `429 RATE_LIMITED`, `Retry-After` ve rate-limit response headerları
- değerler environment variable ile değiştirilebilir

Kod ve otomatik middleware testi başarılıdır. Production öncesi gerçek staging endpointinde kontrollü 429 smoke testi yapılacaktır.

### 2. Danışan oturum tokenını URL query'den çıkar — STAGING TOKEN SCRUB DOĞRULANDI

Yeni danışan linki:
- `room` ve gizli `token` URL fragment (`#room=...&token=...`) içinde oluşturulur
- fragment HTTP request path/query ile sunucuya gönderilmez
- sayfa açıldığında token yalnız aynı sekmenin `sessionStorage` alanına alınır
- adres çubuğu `#room=...` biçimine scrub edilir; token görünür URL'den kaldırılır
- eski `?room=...&token=...` query linkleri yeni frontend tarafından davet olarak okunmaz
- mevcut 6 saatlik backend oda süresi değişmedi

Kod ve CI guard başarılıdır. Staging deploy preview'da gerçek cihazda token scrub doğrulandı (2026-08-29). Yeni fragment linki üzerinden realtime kart seçiminin danışman ekranına ulaştığı son smoke kontrolü bekliyor.

### 3. Production PostgreSQL + backup/restore

Ücretsiz staging PostgreSQL production olarak kullanılmamalı. Ücretli production DB kurulmalı ve gerçek restore tatbikatı yapılmalı.

Kabul ölçütü:
- `/health` → `persistentAccounts: true`
- restart sonrası hesap/lisans kalıcılığı
- yedek oluşturma
- ayrı DB'ye restore
- `advisors` ve `license_events` doğrulaması

### 4. Offline lisans yetkisini sertleştir

Cihaz modu şu an tarayıcıda cache'lenen danışman/lisans bilgisini kullanır. Tarayıcı local storage kullanıcı tarafından değiştirilebilir; bu nedenle offline ücretli özelliğin lisans kontrolü tam güvenli değildir.

Önerilen model:
- backend, kısa/orta süreli imzalı offline entitlement üretir
- frontend yalnız public key ile imzayı doğrular
- entitlement hesap ID + lisans bitişi + son online doğrulama zamanını içerir
- periyodik online yeniden doğrulama gerekir

Bu madde online oturum lisansını etkilemez; online kullanım zaten backend tarafından zorlanır.

## P1 — İlk ücretli kullanıcıdan önce güçlü biçimde önerilir

### 5. E-posta doğrulama

E-posta lisans kimliği olarak kullanılacaksa hesap sahibinin e-postayı doğruladığı kanıtlanmalı. Aksi halde başka bir kişinin adresiyle hesap açılabilir.

### 6. Şifre sıfırlama

Ticari kullanıcı için güvenli tek kullanımlık şifre sıfırlama akışı eklenmeli. Reset tokenları kısa ömürlü ve tek kullanımlık olmalı.

### 7. Admin lisans hareketlerini okunabilir hale getir

`license_events` yalnız DB seviyesinde değil, `ADMIN_LICENSE_SECRET` ile korunan salt-okunur bir yönetim endpointinden de denetlenebilmeli.

### 8. Socket.IO frontend bağımlılığını yerelleştir

PWA shell şu an Socket.IO client dosyasını CDN'den alıyor ve cache'liyor. Production'da aynı sürüm dosyasını frontend ile birlikte self-host etmek dış CDN bağımlılığını ve supply-chain yüzeyini azaltır.

## P2 — Sonraki sertleştirme

- Content Security Policy'yi production domainleri kesinleşince dar allowlist ile etkinleştir
- auth ve admin güvenlik olaylarını minimum kişisel veriyle logla
- dependency update/dependabot süreci kur
- secret rotation prosedürü yaz
- rate-limit state'i birden fazla backend instance kullanılacaksa ortak store'a taşı
- periyodik backup restore tatbikatı ve olay müdahale kontrol listesi oluştur

## Merge kararı

Staging pilotu kabul edilmiştir. P0/1 kod seviyesinde tamamlandı. P0/2 token scrub gerçek cihazda doğrulandı; yalnız realtime seçim smoke kontrolü kaldı. P0/3 production maliyetli altyapı kurulumuna, P0/4 ise offline lisans sertleştirmesine bağlıdır. Bunlar tamamlanmadan "ticari production güvenli" etiketi verilmez.
