# Persona Card

Persona Card, online veya yüz yüze danışmanlık görüşmelerinde ihtiyaç halinde kullanılmak üzere tasarlanan görsel ifade kolaylaştırıcı bir kart çalışma aracıdır.

## Temel ilke

**Kartlar cevap vermez; konuşmayı kolaylaştırır.**

Kartların sistem içinde önceden tanımlanmış psikolojik anlamları, puanları veya yorumları yoktur. Bir kartın danışan için ne ifade ettiği yalnızca danışanın kendi çağrışımı ve görüşme bağlamı içinde ele alınır.

Persona Card bir psikolojik test, ölçek, tanı aracı veya tek başına bir seans yöntemi değildir. Danışmanın görüşme sırasında ihtiyaç duyduğunda kullanabileceği yardımcı bir araçtır.

## V1 kullanıcı akışı

1. Danışman kart setini seçer.
2. Danışman yeni bir kart çalışma oturumu oluşturur.
3. Sistem danışana özel, güvenli bir katılım bağlantısı üretir.
4. Danışan üyelik açmadan bağlantı üzerinden oturuma katılır.
5. Danışan kendisine yakın gelen kartları seçer veya seçimini kaldırır.
6. Danışmanın ekranı eş zamanlı olarak güncellenir.
7. Seçim sırası korunur.
8. Seçimleri sıfırlama ve oturumu kapatma yetkisi yalnızca danışmandadır.

## Kart setleri

- `personita`: 77 kart
- `terapi_sb`: 44 siyah-beyaz kart

## V1 teknik yapı

- Frontend: statik HTML/CSS/JavaScript
- Realtime iletişim: Socket.IO
- Backend: `efaher/terapikart-backend`
- V1 geliştirme dalı: `v1-commercial-foundation`

## V1 kapsamında özellikle bulunmayanlar

- Kartlara otomatik anlam atama
- Yapay zekâ ile kart yorumlama
- Puanlama / ölçek sonucu
- Tanı önerisi
- Danışan dosyası veya terapi notu saklama
- Ödeme / lisans sistemi

Bu özelliklerden ilk dört madde ürün prensibi gereği planlanmamaktadır. Kullanıcı hesabı ve ticari lisanslama, çekirdek oturum akışı doğrulandıktan sonra ticari sürüm aşamasında eklenecektir.

## Ticari hedef

Projenin hedefi, danışmanların düşük maliyetli bir lisansla kullanabildiği; danışanın ise hesap açmadan yalnızca oturum bağlantısıyla katıldığı, sade ve güvenilir bir profesyonel yardımcı araç haline gelmektir.

Ticari yayın öncesinde ayrıca kart görsellerinin dijital/ticari kullanım hakları, KVKK yükümlülükleri, kullanıcı sözleşmesi, gizlilik metni, lisanslama ve ödeme altyapısı tamamlanacaktır.
