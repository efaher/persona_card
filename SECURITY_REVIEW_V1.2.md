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

## P0 — Ticari production öncesi tamamlanmalı

### 1. Kimlik doğrulama rate limit

`/api/auth/login`, `/api/auth/register` ve admin lisans endpointlerinde brute-force / otomasyon sınırı eklenmeli.

Kabul ölçütü:
- IP bazlı limit
- login için ayrıca hesap/e-posta bazlı limit
- limit aşımında genel `429` yanıtı
- başarılı girişte kullanıcı deneyimini bozmayan geri kazanım

### 2. Danışan oturum tokenını URL query'den çıkar

Mevcut danışan davet linkinde `room` ve `token` query parametresinde taşınıyor. Tokenın web sunucusu logu, browser history veya başka ara katmanlara yazılma riskini azaltmak için gizli katılım tokenı URL fragment (`#...`) veya tek kullanımlık exchange-code modeline taşınmalı.

Kabul ölçütü:
- gizli token HTTP request path/query içinde sunucuya gitmemeli
- mevcut 6 saatlik oda süresi korunmalı
- eski query linkleri production'da kabul edilmemeli veya kontrollü geçiş uygulanmalı

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
- periyodik backup restore tatbikatı ve olay müdahale kontrol listesi oluştur

## Merge kararı

Staging pilotu kabul edilmiştir; ancak P0 maddeleri tamamlanmadan "ticari production güvenli" etiketi verilmez. Production maliyetli kaynak kurulumu için ayrıca onay gerekir.
