# Persona Card V1.2 – Ürün Modeli

## Konumlandırma

Persona Card bir psikolojik test, tanı aracı veya terapi yöntemi değildir. Seans sırasında ihtiyaç halinde kullanılan **görsel ifade ve çağrışım kolaylaştırıcı dijital araçtır**.

Ana mesaj: **Kartlar cevap vermez; konuşmayı kolaylaştırır.**

## Ticari model

- 3 çevrimiçi kart çalışması ücretsiz deneme.
- Sonrasında yıllık profesyonel lisans/hizmet dönemi.
- Aylık abonelik yok.
- “Ömür boyu” veya “süresiz” hizmet vaadi yok.
- Fiyat kod içine sabitlenmez; satış sayfası/ödeme katmanından yönetilir.

## Yıllık dönemde hedeflenen hizmet kapsamı

- Persona Card çevrimiçi kullanım hakkı.
- Danışana güvenli bağlantı gönderme ve realtime kart seçimi.
- Aktif kart setlerine erişim.
- Desteklenen tarayıcı ve cihazlarda uyumluluğun sürdürülmesi.
- Kritik hata düzeltmeleri.
- PWA kurulumu ve lisanslı cihaz modu.

Kesin hukuki taahhütler satış sözleşmesinde ayrıca tanımlanacaktır; bu dosya ürün kararı kaydıdır, sözleşme değildir.

## Kullanıcı modeli

### Danışman
- hesap açar ve giriş yapar;
- deneme hakkı/lisans süresi hesabına bağlıdır;
- kart setini seçer;
- çevrimiçi oturum başlatır veya aktif yıllık lisansla cihaz modunu kullanır.

### Danışan
- hesap açmaz;
- uygulama satın almaz;
- yalnızca geçici güvenli bağlantı ile oturuma katılır;
- kart seçer ve seçimini değiştirebilir.

## PWA / cihaz modu

- Persona Card destekleyen tarayıcılarda telefon veya bilgisayara kurulabilir.
- Aktif yıllık lisanslı danışman kart görsellerini cihazına önceden indirebilir.
- Cihaz modu yüz yüze kullanım içindir ve realtime sunucu gerektirmez.
- Danışana uzaktan bağlantı gönderme internet ve aktif çevrimiçi hizmet gerektirir.

## Bakım yükünü sınırlama ilkesi

Ürün mümkün olduğunca statik PWA + küçük realtime backend olarak tutulacaktır. Danışana ait terapi notu, dosya, tanı veya psikolojik profil gibi bakım ve veri sorumluluğunu büyüten modüller V1.2 kapsamına alınmayacaktır.

## Ticari yayına geçmeden önce

1. Kart görsellerinin ticari/dijital kullanım hakkını doğrula.
2. Üretim PostgreSQL veritabanını bağla.
3. Kalıcı `AUTH_SECRET` ve `ADMIN_LICENSE_SECRET` tanımla.
4. Ödeme sağlayıcısını seç ve başarılı ödeme webhook'unu yıllık lisans aktivasyonuna bağla.
5. Kullanım şartları, gizlilik/KVKK ve hizmet kapsamı metinlerini tamamla.
6. `efia.net.tr` altındaki üretim adresine taşı.
7. Uçtan uca deneme → ödeme → yıllık lisans → online oturum → yenileme testini tamamla.
