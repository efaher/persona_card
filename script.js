
// --- START OF FILE script.js (Düzeltilmiş Versiyon) ---

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Referansları ---
    const cardSetSelectionArea = document.getElementById('card-set-selection');
    const roomControlsArea = document.getElementById('room-controls-area');
    const userAuthControls = document.querySelector('.user-auth-controls'); // Şimdilik sadece placeholder
    const selectSetButtons = document.querySelectorAll('.set-options button');
    const roomIdInput = document.getElementById('room-id-input');
    const createJoinRoomButton = document.getElementById('create-join-room-button');
    const currentRoomDisplay = document.getElementById('current-room-display');
    const roomInfoText = document.getElementById('room-info-text'); // Yeni bilgi alanı
    const cardPool = document.getElementById('card-pool');
    const selectSetPrompt = document.getElementById('select-set-prompt'); // Kart havuzu placeholder
    const activeCardSetNameDisplay = document.getElementById('active-card-set-name'); // Başlıktaki span
    const selectedCardsContainer = document.getElementById('selected-cards');
    const resetButton = document.getElementById('reset-button');
    const selectedCountSpan = document.getElementById('selected-count');
    const infoText = document.getElementById('info-text'); // Odada Toplam Seçilen Kartlar
    const noSelectedText = document.getElementById('no-selected-text'); // Seçilen Kartlar alanı placeholder

    // --- Sabitler ve Değişkenler ---
    const backendUrl = 'https://terapikart.onrender.com'; // SİZİN RENDER URL'NİZ
    const socket = io(backendUrl);

    let currentRoomID = null;
    let userId = null; // Socket.IO tarafından atanacak kendi ID'miz

    // YENİ: Kart Seti Bilgileri (key özelliği eklendi, backend'e key gönderilecek)
    const cardSets = {
        personita: { name: 'Personita Kartları', total: 77, folder: 'images/personita', extension: '.jpg', key: 'personita' },
        terapi_sb: { name: 'Siyah Beyaz Terapi Kartları', total: 44, folder: 'images/terapi_sb', extension: '.jpg', key: 'terapi_sb' }
    };
    let activeCardSet = null; // Kullanıcının seçtiği veya odadan gelen aktif kart seti objesi

    let localSelectedCardIds = new Set(); // Bu kullanıcının odada seçtiği kart ID'leri (string)
    let allSelectedCardsInRoom = new Map(); // Odadaki tüm seçili kartlar (cardId:string -> userId:string)
    const MAX_SELECTED_CARDS_PER_USER = 10; // Her kullanıcının seçebileceği max kart
    const MAX_SELECTED_CARDS_PER_ROOM = 10; // Odada toplam seçilebilecek max farklı kart sayısı
    const MAX_USERS_PER_ROOM = 3; // Odadaki maksimum kullanıcı sayısı (bilgi amaçlı)


    // --- Başlangıç Durumu Ayarı ---
    // Sayfa yüklendiğinde arayüz elementlerinin görünürlüğünü ayarlar.
    // Varsayılan olarak sadece kart seti seçimi (ve auth placeholder) görünür.
    // URL'de oda ID varsa bu durum değişir (connect olayında yönetilir).
    function setInitialUIState() {
        console.log("setInitialUIState çalışıyor..."); // <-- Eklendi
        
        console.log("userAuthControls referansı:", userAuthControls); // <-- Eklendi
        userAuthControls.style.display = 'block';
        console.log("userAuthControls display ayarlandı."); // <-- Eklendi
        
        console.log("cardSetSelectionArea referansı:", cardSetSelectionArea); // <-- Eklendi
        cardSetSelectionArea.style.display = 'block';
        console.log("cardSetSelectionArea display ayarlandı."); // <-- Eklendi
        
        console.log("roomControlsArea referansı:", roomControlsArea); // <-- Eklendi
        roomControlsArea.style.display = 'none';
        console.log("roomControlsArea display ayarlandı."); // <-- Eklendi
        
        console.log("controls referansı:", document.querySelector('.controls')); // <-- Eklendi
        document.querySelector('.controls').style.display = 'none';
        console.log("controls display ayarlandı."); // <-- Eklendi
        
        console.log("cardPool referansı:", cardPool); // <-- Eklendi
        cardPool.style.display = 'none';
        console.log("cardPool display ayarlandı."); // <-- Eklendi
        
        console.log("selectedCardsContainer referansı:", selectedCardsContainer); // <-- Eklendi
        selectedCardsContainer.parentElement.style.display = 'none';
        console.log("selectedCardsContainer.parentElement display ayarlandı."); // <-- Eklendi
        
        console.log("selectSetPrompt referansı:", selectSetPrompt); // <-- Eklendi
        selectSetPrompt.style.display = 'block'; // Kart havuzu placeholder'ı göster
        console.log("selectSetPrompt display ayarlandı."); // <-- Eklendi
        
        console.log("activeCardSetNameDisplay referansı:", activeCardSetNameDisplay); // <-- Eklendi
        activeCardSetNameDisplay.textContent = 'Kart Seti Seçilmedi'; // Başlığı resetle
        console.log("activeCardSetNameDisplay içeriği ayarlandı."); // <-- Eklendi
        
        console.log("currentRoomDisplay referansı:", currentRoomDisplay); // <-- Eklendi
        currentRoomDisplay.textContent = 'Henüz bir odada değilsiniz.';
        console.log("currentRoomDisplay içeriği ayarlandı."); // <-- Eklendi
        
        console.log("roomInfoText referansı:", roomInfoText); // <-- Eklendi
        roomInfoText.textContent = '';
        console.log("roomInfoText içeriği ayarlandı."); // <-- Eklendi
        
        // Diğer metinleri de resetle
        console.log("selectedCountSpan referansı:", selectedCountSpan); // <-- Eklendi
        selectedCountSpan.textContent = '0';
        console.log("selectedCountSpan içeriği ayarlandı."); // <-- Eklendi
        
        console.log("infoText referansı:", infoText); // <-- Eklendi
        infoText.textContent = `Seçilen Kartlar (Odada Toplam): 0/${MAX_SELECTED_CARDS_PER_ROOM}`;
        console.log("infoText içeriği ayarlandı."); // <-- Eklendi
        
        console.log("noSelectedText referansı:", noSelectedText); // <-- Eklendi
        noSelectedText.style.display = 'block'; // Seçilenler alanı placeholder göster
        console.log("noSelectedText display ayarlandı."); // <-- Eklendi
        
        console.log("selectedCardsContainer temizleniyor..."); // <-- Eklendi
        selectedCardsContainer.innerHTML = ''; // Seçilenleri temizle
        console.log("selectedCardsContainer içeriği temizlendi."); // <-- Eklendi
        
        console.log("noSelectedText ekleniyor..."); // <-- Eklendi
        selectedCardsContainer.appendChild(noSelectedText); // Placeholder'ı ekle
        console.log("noSelectedText eklendi."); // <-- Eklendi
        
        console.log("cardPool temizleniyor..."); // <-- Eklendi
        cardPool.innerHTML = ''; // Kart havuzunu temizle
        console.log("cardPool içeriği temizlendi."); // <-- Eklendi
        
        console.log("selectSetPrompt ekleniyor..."); // <-- Eklendi
        cardPool.appendChild(selectSetPrompt); // Kart havuzu placeholder'ı ekle
        console.log("selectSetPrompt eklendi."); // <-- Eklendi

        console.log("allSelectedCardsInRoom temizleniyor..."); // <-- Eklendi
        allSelectedCardsInRoom.clear();
        console.log("allSelectedCardsInRoom temizlendi."); // <-- Eklendi
        
        console.log("localSelectedCardIds temizleniyor..."); // <-- Eklendi
        localSelectedCardIds.clear();
        console.log("localSelectedCardIds temizlendi."); // <-- Eklendi
        
        console.log("currentRoomID sıfırlanıyor..."); // <-- Eklendi
        currentRoomID = null; // Oda ID'sini sıfırla
        console.log("currentRoomID sıfırlandı."); // <-- Eklendi
        
        console.log("activeCardSet sıfırlanıyor..."); // <-- Eklendi
        activeCardSet = null; // Aktif seti sıfırla
        console.log("activeCardSet sıfırlandı."); // <-- Eklendi
        
        console.log("setInitialUIState bitti."); // <-- Eklendi
    }


    // --- Socket.IO Bağlantı Olayları ---
    socket.on('connect', () => {
        userId = socket.id;
        console.log('Backend\'e bağlandı! Kullanıcı ID:', userId);

        // Bağlantı kurulduğunda, URL'de oda ID varsa direkt katılmayı dene
        const urlParams = new URLSearchParams(window.location.search);
        const roomIDFromUrl = urlParams.get('oda'); // index.html?oda=ODA_IDSI

        if (roomIDFromUrl) {
             // URL'den oda ID geldi => Danışan olma durumu (veya danışmanın linkle girmesi)
             // Kart seti seçimi beklemeden odaya katılmayı dene
             // Arayüzü odaya katılım bekleniyor durumuna getir

             userAuthControls.style.display = 'none'; // Auth alanını gizle
             cardSetSelectionArea.style.display = 'none'; // Set seçimini gizle
             roomControlsArea.style.display = 'block'; // Oda kontrollerini göster
             roomIdInput.style.display = 'none'; // Oda ID inputunu gizle
             createJoinRoomButton.style.display = 'none'; // Oda oluştur/katıl butonunu gizle

             currentRoomDisplay.textContent = `Odaya Katılıyor: "${roomIDFromUrl}"...`;
             roomInfoText.textContent = 'Sunucudan yanıt bekleniyor...';

             // Backend'e katılma isteği gönder (Set bilgisi backend'den gelecek)
             // NOT: URL ile katılırken backend'e set bilgisi göndermiyoruz,
             // backend odanın set bilgisini bize geri gönderecek.
             socket.emit('joinRoom', { roomID: roomIDFromUrl });

        } else {
             // URL'de oda ID yok => Danışman olma veya ilk giriş durumu
             // setInitialUIState() zaten bu durumu ayarladı (Set seçimi görünür).
             // Oda ID inputunu ve butonu görünür yapalım ki danışman oda kurabilsin
             roomControlsArea.style.display = 'block'; // Oda kontroller alanını göster
             roomIdInput.style.display = 'inline-block'; // Inputu göster
             createJoinRoomButton.style.display = 'inline-block'; // Butonu göster

             // Diğer tüm arayüz alanları setInitialUIState() ile gizli kalır.
        }
    });

    socket.on('disconnect', () => {
        console.log('Backend ile bağlantı kesildi!');
        alert('Sunucu ile bağlantı kesildi. Lütfen sayfayı yenileyin.'); // Kullanıcıya bilgi ver
        setInitialUIState(); // Arayüzü başlangıç durumuna döndür
        currentRoomDisplay.textContent = 'Sunucu ile bağlantı kesildi.';
    });

    // --- Kart Seti Seçimi Mantığı ---
    selectSetButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!socket.connected) {
                alert('Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin veya sayfayı yenileyin.');
                return;
            }

            const selectedSetKey = button.dataset.setname; // Butonun data-setname'inden anahtarı al
            activeCardSet = cardSets[selectedSetKey]; // activeCardSet objesini ata

            if (activeCardSet) {
                console.log('Kart seti seçildi:', activeCardSet.name, 'Anahtar:', selectedSetKey);

                // Arayüzü güncelle: Kart seti seçimi alanını gizle, oda kontrollerini ve kart alanlarını göster
                cardSetSelectionArea.style.display = 'none';
                userAuthControls.style.display = 'none'; // Giriş alanı (şimdilik) gizle
                roomControlsArea.style.display = 'block'; // Oda kontrollerini göster
                document.querySelector('.controls').style.display = 'block'; // Reset butonu ve bilgi metnini göster
                cardPool.style.display = 'flex'; // Kart havuzunu göster (flex yapısı için)
                selectedCardsContainer.parentElement.style.display = 'block'; // Seçilenler başlığını ve alanı göster

                activeCardSetNameDisplay.textContent = activeCardSet.name; // Başlıktaki adı güncelle
                selectSetPrompt.style.display = 'none'; // Placeholder metni gizle

                // Kartları Yükle (Seçilen Sete Göre)
                initializeCards(); // Bu, updateUIForRoom'u çağıracak.

                // Oda ID inputuna odaklan ve görünür yap
                roomIdInput.style.display = 'inline-block'; // Inputu göster
                createJoinRoomButton.style.display = 'inline-block'; // Butonu göster
                roomIdInput.focus();

                currentRoomDisplay.textContent = 'Bir Oda ID girip Katılın/Oluşturun'; // Oda bekliyor mesajı

            } else {
                console.error('Bilinmeyen kart seti seçildi veya data-setname hatalı:', selectedSetKey);
                alert('Kart seti seçilirken bir hata oluştu.');
            }
        });
    });

    // --- Kart Oluşturma Fonksiyonu ---
    function createCardElement(cardId, isSelectedClone = false) {
        if (!activeCardSet) {
            console.error("createCardElement: Aktif kart seti tanımlı değil!");
            return null; // Hata durumunda null döndür
        }
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.cardId = String(cardId); // Data attribute string olmalı

        const cardNumberSpan = document.createElement('span');
        cardNumberSpan.classList.add('card-number');
        cardNumberSpan.textContent = `${cardId}`;
        card.appendChild(cardNumberSpan);

        const img = document.createElement('img');
        // Resim yolunu aktif kart setinden al
        const imagePath = `${activeCardSet.folder}/${cardId}${activeCardSet.extension}`;
        img.src = imagePath;
        img.alt = `${activeCardSet.name} Kart ${cardId}`;

        img.onerror = () => {
            console.warn(`Görsel yüklenemedi: ${imagePath}`);
            // Kırık resim ikonunu gizle ve numarayı belirgin yap
            img.style.display = 'none';
            cardNumberSpan.style.backgroundColor = 'transparent';
            cardNumberSpan.style.color = '#dc3545'; // Hata rengi
        };
        card.appendChild(img);

        // Seçili alandaki klonlar için tıklama işlevi
        if (isSelectedClone) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => handleSelectedCardClick(String(cardId), card));
        }

        return card;
    }

    // --- Kartları Yükleme Fonksiyonu ---
    function initializeCards() {
        if (!activeCardSet) {
            console.error("Aktif kart seti seçilmeden initializeCards çağrıldı!");
            setInitialUIState(); // Başlangıç durumuna dön
            selectSetPrompt.textContent = 'Kart seti yüklenemedi. Lütfen tekrar deneyin.';
            return;
        }

        cardPool.innerHTML = ''; // Kart havuzunu temizle
        selectSetPrompt.style.display = 'none'; // Placeholder'ı gizle

        const TOTAL_CARDS = activeCardSet.total; // Aktif setin toplam kart sayısı

        for (let i = 1; i <= TOTAL_CARDS; i++) {
            const card = createCardElement(i);
            if(card) { // Eğer createCardElement hata vermezse
                 card.addEventListener('click', () => handleCardPoolClick(i, card));
                 cardPool.appendChild(card);
            }
        }
         // Kartlar yüklendikten sonra UI'ı güncelle (seçili kartlar varsa göstermek için)
         updateUIForRoom(); // <<<< Burası doğru yer
    }

    // --- Kart Havuzu Kart Tıklama (Seçme) ---
    function handleCardPoolClick(cardId, cardElement) {
         if (!socket.connected || !currentRoomID) {
            alert('Lütfen önce bir odaya katılın veya oluşturun.');
            return;
        }

        const cardIdStr = String(cardId); // ID'yi string yap consistency için

        if (cardElement.classList.contains('disabled-in-pool')) {
            // Başkası tarafından seçilmiş ve pasif durumda
            alert('Bu kart odada zaten başkası tarafından seçilmiş.');
            return;
        }
         // Kendi seçtiğimiz bir karta havuzda tekrar tıklamayı engelle
         if (cardElement.classList.contains('selected-by-me')) {
             // Seçili alandaki klonuna tıklayarak iptal etmesi gerektiğini belirtebiliriz.
             // alert("Kendi seçtiğiniz kartı iptal etmek için alttaki 'Seçilen Kartlar' alanından tıklayınız.");
             return; // Şimdilik bir şey yapmasın
         }


        // Lokal olarak bu kullanıcının seçtiği limit kontrolü
        if (localSelectedCardIds.size >= MAX_SELECTED_CARDS_PER_USER) {
            alert(`Bu odada kişisel olarak en fazla ${MAX_SELECTED_CARDS_PER_USER} kart seçebilirsiniz.`);
            return;
        }

        // Odadaki toplam seçili farklı kart limit kontrolü
         if (allSelectedCardsInRoom.size >= MAX_SELECTED_CARDS_PER_ROOM && !allSelectedCardsInRoom.has(cardIdStr)) {
            alert(`Odada en fazla ${MAX_SELECTED_CARDS_PER_ROOM} farklı kart seçilebilir.`);
            return;
        }

        // Sunucuya kart seçme isteği gönder
        socket.emit('selectCard', { roomID: currentRoomID, cardId: cardIdStr });
    }

    // --- Seçilen Kartlar Kart Tıklama (İptal Etme) ---
    function handleSelectedCardClick(cardId, cardElement) {
        if (!socket.connected || !currentRoomID) return;

        const cardIdStr = String(cardId); // ID'yi string yap

        // Sadece kendi seçtiği kartı iptal edebilir
        if (allSelectedCardsInRoom.has(cardIdStr) && allSelectedCardsInRoom.get(cardIdStr) === userId) {
            socket.emit('deselectCard', { roomID: currentRoomID, cardId: cardIdStr });
        } else {
             // Başkası tarafından seçilmiş bir karta tıklanırsa uyarı ver
             if(allSelectedCardsInRoom.has(cardIdStr)) {
                alert("Bu kartı siz seçmediğiniz için iptal edemezsiniz.");
             }
             // Seçili olmayan bir karta (ki bu durum olmamalı selected alanda) tıklanırsa bir şey yapma
        }
    }

    // --- Oda Oluşturma/Katılma Butonu ---
    createJoinRoomButton.addEventListener('click', () => {
        if (!socket.connected) {
             alert('Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin veya sayfayı yenileyin.');
             return;
        }
         if (!activeCardSet) {
             alert('Lütfen önce bir kart seti seçin.');
             return;
         }

        const roomID = roomIdInput.value.trim();
        if (!roomID) {
            alert('Lütfen bir Oda ID girin.');
            return;
        }

        if (currentRoomID === roomID) {
            roomInfoText.textContent = `Zaten "${roomID}" odasındasınız.`;
            return;
        }

        // Önceki odadan ayrıl (varsa)
        if (currentRoomID) {
            socket.emit('leaveRoom', currentRoomID); // Backend'de bu olay için handler gerekebilir
            console.log(`Önceki odadan ayrılma isteği gönderildi: ${currentRoomID}`);
        }

        // Oda ID ve Seçilen Kart Seti anahtarı ile katılma isteği gönder
        socket.emit('joinRoom', { roomID: currentRoomID, cardSet: activeCardSet.key }); // <<< Burası artık key gönderiyor

        currentRoomID = roomID; // Oda ID'sini frontend state'ine kaydet

        currentRoomDisplay.textContent = `Odaya Katılıyor: "${currentRoomID}"...`;
        roomInfoText.textContent = 'Sunucudan yanıt bekleniyor...';
        // Başarılı katılım backend'den 'currentSelectedCards' veya 'roomFull' olaylarıyla bildirilecek
    });

    // --- Davet Linki Kopyalama (Öneri - İleride Eklenebilir) ---
    // function generateInviteLink(roomID) {
    //     // Bu fonksiyonu bir butona bağlayabilirsiniz
    //     const inviteUrl = `${window.location.origin}${window.location.pathname}?oda=${roomID}`;
    //     navigator.clipboard.writeText(inviteUrl).then(() => {
    //         alert('Davet linki panoya kopyalandı!');
    //     }).catch(err => {
    //         console.error('Davet linki kopyalanamadı:', err);
    //         alert('Davet linki kopyalanamadı. Lütfen tarayıcı konsoluna bakın.');
    //     });
    //     return inviteUrl;
    // }


    // --- Seçimi Sıfırla Butonu ---
    resetButton.addEventListener('click', () => {
        if (!socket.connected || !currentRoomID) {
            alert('Lütfen önce bir odaya katılın.');
            return;
        }
        // Backend'de admin yetkisi kontrol edilecek ileride
        socket.emit('resetRoomCards', currentRoomID); // Backend'e oda ID'sini gönder
        roomInfoText.textContent = 'Kartlar sıfırlanıyor...';
    });

    // --- Arayüz Güncelleme Fonksiyonu ---
    function updateUIForRoom() {
         if (!activeCardSet) {
             console.error("updateUIForRoom: Aktif kart seti tanımlı değil!");
             //setInitialUIState(); // Başlangıç durumuna dön (sonsuz döngüye neden olabilir!)
             // roomInfoText.textContent = 'Hata: Arayüz güncellenemiyor (Set Tanımsız).';
             return; // Güncelleme yapma
         }

        // Kart havuzunu güncelle
        const poolCards = cardPool.querySelectorAll('.card');
        poolCards.forEach(card => {
            const cId = card.dataset.cardId;
            card.classList.remove('disabled-in-pool', 'selected-by-me'); // Önceki durumları temizle
            card.style.cursor = 'pointer'; // Varsayılan imleci ayarla

            if (allSelectedCardsInRoom.has(cId)) {
                if (allSelectedCardsInRoom.get(cId) === userId) {
                    card.classList.add('selected-by-me'); // Benim seçtiğim
                    card.style.cursor = 'default'; // Havuzda kendi kartıma tıklamayı görsel olarak engelle
                } else {
                    card.classList.add('disabled-in-pool'); // Başkasının seçtiği
                     card.style.cursor = 'not-allowed'; // Havuzda başkasının kartına tıklamayı görsel olarak engelle
                }
            } else {
                 card.style.cursor = 'pointer'; // Seçili değilse tıklanabilir
            }
        });

        // Seçilen kartlar alanını güncelle
        selectedCardsContainer.innerHTML = ''; // Temizle
        if (allSelectedCardsInRoom.size === 0) {
            noSelectedText.style.display = 'block';
            selectedCardsContainer.appendChild(noSelectedText);
        } else {
            noSelectedText.style.display = 'none';
            // Seçili kartları (kendi seçtiklerimiz ve başkalarının seçtikleri) göster
            // Map'in entry'lerini array'e çevirip sıralayabiliriz (örn: kartaId'ye göre)
            const sortedSelectedCards = Array.from(allSelectedCardsInRoom.entries())
                                            .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));

            sortedSelectedCards.forEach(([cardId, selectorUserId]) => {
                 // Seçilen alandaki klonları oluştururken tıklanabilir yapıyoruz (iptal için)
                 const cardClone = createCardElement(cardId, true); // true = isSelectedClone

                 if (cardClone) { // Eğer kart elementi başarıyla oluşturulduysa
                     if (selectorUserId !== userId) {
                         // Başkasının kartıysa farklı bir işaretleme/stil yapılabilir
                         // cardClone.style.borderColor = 'gray'; // Örnek: Başkasının kartı
                         cardClone.classList.add('selected-by-other'); // Yeni class
                         cardClone.querySelector('.card-number').textContent += ` (${selectorUserId.substring(0,3)}...)`; // Kimin seçtiğini göster (opsiyonel)
                     } else {
                         cardClone.classList.add('selected-by-me'); // Benim seçtiğim klon
                     }
                     selectedCardsContainer.appendChild(cardClone);
                 }
            });
        }

        // Bilgi metinlerini güncelle
        selectedCountSpan.textContent = allSelectedCardsInRoom.size; // Odada toplam seçilen kart sayısı
        infoText.textContent = `Seçilen Kartlar (Odada Toplam): ${allSelectedCardsInRoom.size}/${MAX_SELECTED_CARDS_PER_ROOM}`;
        // currentRoomDisplay ve roomInfoText'teki oda bilgileri zaten odaya katılırken güncelleniyor.
        roomInfoText.textContent = `Kişisel Seçimler: ${localSelectedCardIds.size}/${MAX_SELECTED_CARDS_PER_USER}`; // Kişisel limiti de göster
        // Oda katılım mesajını sil
        if (roomInfoText.textContent.includes('Odaya katılıyor...') || roomInfoText.textContent.includes('Sunucudan yanıt bekleniyor...')) {
             roomInfoText.textContent = ''; // Bekleme mesajını temizle
        }

    }


    // --- SOCKET.IO OLAY DİNLEYİCİLERİ (Backend'den Gelen Mesajlar) ---

    // Odaya Katılım Başarılı Oldu (Backend'den Gelen Mevcut Durum)
    socket.on('currentSelectedCards', (data) => { // { roomID, cardSet, selectedCards, userCount }
        console.log('Odaya Katılım Başarılı.', data); // <<< BURASI ÇALIŞIYOR VE data KONTROL EDİLDİ

        // YENİ: Backend'den gelen set anahtarını alarak aktif seti ata
        const backendCardSetKey = data.cardSet; // <<< Backend'den gelen set bilgisi, KEY olmalı artık
        const matchingCardSet = cardSets[backendCardSetKey];} // <<< Doğrudan anahtarla eşleştirme