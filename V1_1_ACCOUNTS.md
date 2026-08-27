# Persona Card V1.1 — Danışman Hesapları

## Amaç
Persona Card'ın satılabilir ürün omurgasını oluşturmak: danışman hesabı, ücretsiz deneme kotası ve lisans durumuna bağlı oturum oluşturma.

## Kullanıcı akışı
1. Danışman e-posta ve şifreyle hesap oluşturur veya giriş yapar.
2. Yeni hesap 3 ücretsiz kart çalışması hakkıyla başlar.
3. Danışman kart setini seçip oturum oluşturur.
4. Bir çalışma oluşturulduğunda ücretsiz kotadan 1 hak düşer.
5. Danışan üyelik açmadan davet bağlantısından katılır.
6. Ücretsiz haklar bittiğinde yeni oturum oluşturma backend tarafından engellenir.

## Ürün sınırı
- Danışan hesabı yoktur.
- Kartlara psikolojik anlam, puan veya otomatik yorum verilmez.
- Görüşme notu, tanı veya serbest metin psikolojik veri saklanmaz.
- Ödeme altyapısı V1.1 kapsamına dahil değildir.

## Lisans alanları
Backend şu planları destekleyecek şekilde tasarlanmıştır:
- `trial`: 3 ücretsiz çalışma
- `annual`: yıllık lisans
- `founder`: kurucu kullanıcı / süresiz lisans
- `lifetime`: süresiz lisans

## Main'e geçiş koşulları
- PostgreSQL `DATABASE_URL` bağlanmalı.
- Güçlü ve kalıcı `AUTH_SECRET` tanımlanmalı.
- Kayıt/giriş/çıkış testi yapılmalı.
- 3 ücretsiz çalışmanın doğru azaldığı doğrulanmalı.
- Ücretsiz hak 0 olduğunda yeni oturumun backend tarafından engellendiği doğrulanmalı.
- Danışan bağlantısının hesap gerektirmeden çalıştığı doğrulanmalı.
- Mevcut gerçek zamanlı kart seçimi regresyon testinden geçmeli.
