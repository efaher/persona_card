// --- START OF FILE script.js (Nihai Düzeltilmiş Versiyon) ---

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

    // Kart Seti Bilgileri (key özelliği eklendi, backend'e key gönderilecek)
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
        console.log("setInitialUIState çalışıyor...");

        // Tüm ana alanları varsayılan olarak gizle
        if(userAuthControls) userAuthControls.style.display = 'none';
        if(cardSetSelectionArea) cardSetSelectionArea.style.display = 'none';
        if(roomControlsArea) roomControlsArea.style.display = 'none';
        const controlsDiv = document.querySelector('.controls');
        if(controlsDiv) controlsDiv.style.display = 'none';
        if(cardPool) cardPool.style.display = 'none';
        if(selectedCardsContainer && selectedCardsContainer.parentElement) {
            selectedCardsContainer.parentElement.style.display = 'none';
        }

        // Sonra başlangıçta görünmesi gerekenleri göster
        if(userAuthControls) userAuthControls.style.display = 'block'; // Auth placeholder görünür
        if(cardSetSelectionArea) cardSetSelectionArea.style.display = 'block'; // Kart seti seçim alanı görünür

        // Metinleri ve placeholder'ları resetle
        if(selectSetPrompt) selectSetPrompt.style.display = 'block'; // Kart havuzu placeholder'ı göster
        if(activeCardSetNameDisplay) activeCardSetNameDisplay.textContent = 'Kart Seti Seçilmedi'; // Başlığı resetle
        if(currentRoomDisplay) currentRoomDisplay.textContent = 'Henüz bir odada değilsiniz.';
        if(roomInfoText) roomInfoText.textContent = '';
        if(selectedCountSpan) selectedCountSpan.textContent = '0';
        if(infoText) infoText.textContent = `Seçilen Kartlar (Odada Toplam): 0/${MAX_SELECTED_CARDS_PER_ROOM}`;
        if(noSelectedText) noSelectedText.style.display = 'block'; // Seçilenler alanı placeholder göster

        // İçerikleri temizle
        if(selectedCardsContainer) selectedCardsContainer.innerHTML = ''; // Seçilenleri temizle
        if(selectedCardsContainer && noSelectedText) selectedCardsContainer.appendChild(noSelectedText); // Placeholder'ı ekle
        if(cardPool) cardPool.innerHTML = ''; // Kart havuzunu temizle
        if(cardPool && selectSetPrompt) cardPool.appendChild(selectSetPrompt); // Kart havuzu placeholder'ı ekle


        // State değişkenlerini sıfırla
        allSelectedCardsInRoom.clear();
        localSelectedCardIds.clear();
        currentRoomID = null;
        activeCardSet = null;

        console.log("setInitialUIState bitti.");
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
             if(userAuthControls) userAuthControls.style.display = 'none';
             if(cardSetSelectionArea) cardSetSelectionArea.style.display = 'none';
             if(roomControlsArea) roomControlsArea.style.display = 'block'; // Oda kontrollerini göster
             if(roomIdInput) roomIdInput.style.display = 'none'; // Oda ID inputunu gizle
             if(createJoinRoomButton) createJoinRoomButton.style.display = 'none'; // Oda oluştur/katıl butonunu gizle
             const controlsDiv = document.querySelector('.controls');
             if(controlsDiv) controlsDiv.style.display = 'block'; // Reset butonu vs göster
             if(cardPool) cardPool.style.display = 'flex'; // Kart havuzunu göster
             if(selectedCardsContainer && selectedCardsContainer.parentElement) {
                selectedCardsContainer.parentElement.style.display = 'block'; // Seçilenler alanı göster
             }

             if(currentRoomDisplay) currentRoomDisplay.textContent = `Odaya Katılıyor: "${roomIDFromUrl}"...`;
             if(roomInfoText) roomInfoText.textContent = 'Sunucudan yanıt bekleniyor...';

             // Backend'e katılma isteği gönder (Set bilgisi backend'den gelecek)
             // NOT: URL ile katılırken backend'e set bilgisi göndermiyoruz,
             // backend odanın set bilgisini bize geri gönderecek.
             socket.emit('joinRoom', { roomID: roomIDFromUrl });

        } else {
             // URL'de oda ID yok => Danışman olma veya ilk giriş durumu
             // setInitialUIState() zaten bu durumu ayarladı (Set seçimi görünür).
             // Oda ID inputunu ve butonu görünür yapalım ki danışman oda kurabilsin
             if(roomControlsArea) roomControlsArea.style.display = 'block'; // Oda kontroller alanını göster
             if(roomIdInput) roomIdInput.style.display = 'inline-block'; // Inputu göster
             if(createJoinRoomButton) createJoinRoomButton.style.display = 'inline-block'; // Butonu göster

             // Diğer tüm arayüz alanları setInitialUIState() ile gizli kalır.
        }
    });

    socket.on('disconnect', () => {
        console.log('Backend ile bağlantı kesildi!');
        alert('Sunucu ile bağlantı kesildi. Lütfen sayfayı yenileyin.'); // Kullanıcıya bilgi ver
        setInitialUIState(); // Arayüzü başlangıç durumuna döndür
        if(currentRoomDisplay) currentRoomDisplay.textContent = 'Sunucu ile bağlantı kesildi.';
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
                if(cardSetSelectionArea) cardSetSelectionArea.style.display = 'none';
                if(userAuthControls) userAuthControls.style.display = 'none'; // Giriş alanı (şimdilik) gizle
                if(roomControlsArea) roomControlsArea.style.display = 'block'; // Oda kontrollerini göster
                const controlsDiv = document.querySelector('.controls');
                if(controlsDiv) controlsDiv.style.display = 'block'; // Reset butonu ve bilgi metnini göster
                if(cardPool) cardPool.style.display = 'flex'; // Kart havuzunu göster (flex yapısı için)
                 if(selectedCardsContainer && selectedCardsContainer.parentElement) {
                    selectedCardsContainer.parentElement.style.display = 'block'; // Seçilenler başlığını ve alanı göster
                 }


                if(activeCardSetNameDisplay) activeCardSetNameDisplay.textContent = activeCardSet.name; // Başlıktaki adı güncelle
                if(selectSetPrompt) selectSetPrompt.style.display = 'none'; // Placeholder metni gizle

                // Kartları Yükle (Seçilen Sete Göre)
                initializeCards(); // Bu, updateUIForRoom'u çağıracak.

                // Oda ID inputunu odaklan ve görünür yap
                if(roomIdInput) roomIdInput.style.display = 'inline-block'; // Inputu göster
                if(createJoinRoomButton) createJoinRoomButton.style.display = 'inline-block'; // Butonu göster
                 if(roomIdInput) roomIdInput.focus();

                if(currentRoomDisplay) currentRoomDisplay.textContent = 'Bir Oda ID girip Katılın/Oluşturun'; // Oda bekliyor mesajı

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
            if(img) img.style.display = 'none';
            if(cardNumberSpan) cardNumberSpan.style.backgroundColor = 'transparent';
             if(cardNumberSpan) cardNumberSpan.style.color = '#dc3545'; // Hata rengi
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
            if(selectSetPrompt) selectSetPrompt.textContent = 'Kart seti yüklenemedi. Lütfen tekrar deneyin.';
            return;
        }

        if(cardPool) cardPool.innerHTML = ''; // Kart havuzunu temizle
        if(selectSetPrompt) selectSetPrompt.style.display = 'none'; // Placeholder'ı gizle

        const TOTAL_CARDS = activeCardSet.total; // Aktif setin toplam kart sayısı

        for (let i = 1; i <= TOTAL_CARDS; i++) {
            const card = createCardElement(i);
            if(card) { // Eğer createCardElement hata vermezse
                 card.addEventListener('click', () => handleCardPoolClick(i, card));
                 if(cardPool) cardPool.appendChild(card);
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
            if(roomInfoText) roomInfoText.textContent = `Zaten "${roomID}" odasındasınız.`;
            return;
        }

        // Önceki odadan ayrıl (varsa)
        if (currentRoomID) {
            socket.emit('leaveRoom', currentRoomID); // Backend'de bu olay için handler gerekebilir
            console.log(`Önceki odadan ayrılma isteği gönderildi: ${currentRoomID}`);
        }

        // Oda ID ve Seçilen Kart Seti anahtarı ile katılma isteği gönder
        socket.emit('joinRoom', { roomID: roomID, cardSet: activeCardSet.key }); // <<< Burası artık key gönderiyor

        currentRoomID = roomID; // Oda ID'sini frontend state'ine kaydet

        if(currentRoomDisplay) currentRoomDisplay.textContent = `Odaya Katılıyor: "${currentRoomID}"...`;
        if(roomInfoText) roomInfoText.textContent = 'Sunucudan yanıt bekleniyor...';
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
        if(roomInfoText) roomInfoText.textContent = 'Kartlar sıfırlanıyor...';
    });

    // --- Arayüz Güncelleme Fonksiyonu ---
    function updateUIForRoom() {
         if (!activeCardSet) {
             console.error("updateUIForRoom: Aktif kart seti tanımlı değil!");
             // setInitialUIState(); // Başlangıç durumuna dön (sonsuz döngüye neden olabilir!)
             // roomInfoText.textContent = 'Hata: Arayüz güncellenemiyor (Set Tanımsız).';
             return; // Güncelleme yapma
         }

        // Kart havuzunu güncelle
        const poolCards = cardPool.querySelectorAll('.card');
        poolCards.forEach(card => {
            const cId = card.dataset.cardId;
            card.classList.remove('disabled-in-pool', 'selected-by-me', 'selected-by-other'); // Önceki durumları temizle
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
        if(selectedCardsContainer) selectedCardsContainer.innerHTML = ''; // Temizle
        if (allSelectedCardsInRoom.size === 0) {
            if(noSelectedText) noSelectedText.style.display = 'block';
            if(selectedCardsContainer && noSelectedText) selectedCardsContainer.appendChild(noSelectedText);
        } else {
            if(noSelectedText) noSelectedText.style.display = 'none';
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
                         const cardNumberSpan = cardClone.querySelector('.card-number');
                         if(cardNumberSpan) cardNumberSpan.textContent += ` (${selectorUserId.substring(0,3)}...)`; // Kimin seçtiğini göster (opsiyonel)
                     } else {
                         cardClone.classList.add('selected-by-me'); // Benim seçtiğim klon
                     }
                     if(selectedCardsContainer) selectedCardsContainer.appendChild(cardClone);
                 }
            });
        }

        // Bilgi metinlerini güncelle
        if(selectedCountSpan) selectedCountSpan.textContent = allSelectedCardsInRoom.size; // Odada toplam seçilen kart sayısı
        if(infoText) infoText.textContent = `Seçilen Kartlar (Odada Toplam): ${allSelectedCardsInRoom.size}/${MAX_SELECTED_CARDS_PER_ROOM}`;
        // currentRoomDisplay ve roomInfoText'teki oda bilgileri zaten odaya katılırken güncelleniyor.
         // Kişisel Seçimler bilgisini de güncelleyelim (roomInfoText odaya katılım mesajıyla karışmasın)
         const personalCountText = `Kişisel Seçimler: ${localSelectedCardIds.size}/${MAX_SELECTED_CARDS_PER_USER}`;
         const roomStatusText = `Oda: "${currentRoomID}" (ID: ${userId.substring(0,6)}...)`;
        if(currentRoomDisplay) currentRoomDisplay.textContent = roomStatusText;
        if(roomInfoText) roomInfoText.textContent = personalCountText;


    }


    // --- SOCKET.IO OLAY DİNLEYİCİLERİ (Backend'den Gelen Mesajlar) ---

    // Odaya Katılım Başarılı Oldu (Backend'den Gelen Mevcut Durum)
    socket.on('currentSelectedCards', (data) => { // { roomID, cardSet, selectedCards, userCount }
        console.log('Odaya Katılım Başarılı.', data); // <<< BURASI ÇALIŞIYOR VE data KONTROL EDİLDİ

        // YENİ: Backend'den gelen set anahtarını alarak aktif seti ata
        const backendCardSetKey = data.cardSet; // <<< Backend'den gelen set bilgisi, KEY olmalı artık
        const matchingCardSet = cardSets[backendCardSetKey]; // <<< Doğrudan anahtarla eşleştirme

        // Hata kontrolü: Backend'den gelen set anahtarı geçerli mi?
        if (!backendCardSetKey || !matchingCardSet) { // <<< Kontrolü bu şekilde değiştirdik!
             console.error('Backend\'den geçersiz set anahtarı geldi:', backendCardSetKey);
             if(roomInfoText) roomInfoText.textContent = 'Hata: Geçersiz oda bilgisi (Set Anahtarı Hatalı).';
             // Otomatik ayrılma, başlangıç durumu vb.
             if(data.roomID) { // Eğer backend bir roomID gönderdiyse o odayı terk et
                 socket.emit('leaveRoom', data.roomID);
             }
             setInitialUIState(); // Arayüzü başlangıç durumuna döndür
             alert('Odaya katılırken bir hata oluştu: Geçersiz kart seti bilgisi.');
             return; // Hata varsa burada dur
        }

        // Eğer her şey yolundaysa:
        currentRoomID = data.roomID; // Backend'den gelen teyitli oda ID'si
        activeCardSet = matchingCardSet; // <<< Eşleşen set objesini ata

        // Arayüzü odaya uygun hale getir
        if(userAuthControls) userAuthControls.style.display = 'none'; // Giriş alanı (şimdilik) gizle
        if(cardSetSelectionArea) cardSetSelectionArea.style.display = 'none'; // Set seçimi gizle
        if(roomControlsArea) roomControlsArea.style.display = 'block'; // Oda kontrollerini göster
        const controlsDiv = document.querySelector('.controls');
        if(controlsDiv) controlsDiv.style.display = 'block'; // Reset butonu vs göster
        if(cardPool) cardPool.style.display = 'flex'; // Kart havuzunu göster
         if(selectedCardsContainer && selectedCardsContainer.parentElement) {
            selectedCardsContainer.parentElement.style.display = 'block'; // Seçilenler alanı göster
         }

        if(activeCardSetNameDisplay) activeCardSetNameDisplay.textContent = activeCardSet.name; // Başlıktaki adı güncelle
        if(selectSetPrompt) selectSetPrompt.style.display = 'none'; // Placeholder gizle

        // Kartları doğru set'e göre yükle (Bu aynı zamanda updateUIForRoom'u çağırır)
        initializeCards();

        // Mevcut seçili kartları işle (initializeCards'ın sonundaki updateUIForRoom bunu yapacak)
        allSelectedCardsInRoom.clear(); // Öncekileri temizle
        localSelectedCardIds.clear(); // Kişisel seçilenleri temizle
        data.selectedCards.forEach(cardInfo => { // Backend'den gelen seçili kartları ekle
            allSelectedCardsInRoom.set(String(cardInfo.cardId), cardInfo.userId);
            if (cardInfo.userId === userId) {
                localSelectedCardIds.add(String(cardInfo.cardId));
            }
        });

        // updateUIForRoom() initializeCards tarafından çağrıldığı için burada tekrar çağırmaya gerek yok.

        // Oda bilgisi metinlerini güncelle (Zaten yukarıda yapılıyor, burada tekrarlamaya gerek yok)
        // currentRoomDisplay.textContent = `Oda: "${currentRoomID}" (ID: ${userId.substring(0,6)}...)`;
        // roomInfoText.textContent = `Odaya başarıyla katıldınız. Kullanıcılar: ${data.userCount}/${MAX_USERS_PER_ROOM}`;


        // ... Geri kalan mantık (Davet linki vb.) ...

    }); // <<< BURASI socket.on('currentSelectedCards') DİNLEYİCİSİNİN KAPANIŞI

    // --- Oda Dolu Hatası ---
    socket.on('roomFull', () => {
        alert('Bu oda dolu (' + MAX_USERS_PER_ROOM + ' kişi). Lütfen farklı bir Oda ID deneyin.');
        console.warn('Oda dolu hatası alındı.');
        setInitialUIState(); // Başlangıç durumuna dön
        if(currentRoomDisplay) currentRoomDisplay.textContent = 'Oda dolu.';
        if(roomInfoText) roomInfoText.textContent = 'Lütfen farklı bir Oda ID girin.';
    });

     // Backend'den gelen hata mesajları için (örn: farklı set ile kurulmuş oda)
     socket.on('errorJoiningRoom', (message) => {
         console.error('Odaya katılırken hata:', message);
         alert('Odaya katılırken bir hata oluştu: ' + message);
         setInitialUIState(); // Başlangıç durumuna dön
         if(currentRoomDisplay) currentRoomDisplay.textContent = 'Katılım Hatası.';
         if(roomInfoText) roomInfoText.textContent = message;
     });


    // Başka Kullanıcıdan Kart Seçildi/Kendi Seçimim Onaylandı
    socket.on('cardSelected', (data) => { // { cardId, userId }
        const cardIdStr = String(data.cardId);
        allSelectedCardsInRoom.set(cardIdStr, data.userId);
        if (data.userId === userId) {
            localSelectedCardIds.add(cardIdStr);
             // roomInfoText.textContent = `Kart ${data.cardId} seçildi.`; // Çok sık güncellenmesin diye kaldırdım
        } else {
             // roomInfoText.textContent = `Kullanıcı (${data.userId.substring(0,3)}...) Kart ${data.cardId} seçti.`; // Çok sık güncellenmesin diye kaldırdım
        }
        updateUIForRoom(); // Arayüzü güncelle
    });

    // Başka Kullanıcıdan Kart İptal Edildi/Kendi İptalim Onaylandı
    socket.on('cardDeselected', (data) => { // { cardId, userId }
        const cardIdStr = String(data.cardId);
        if (allSelectedCardsInRoom.has(cardIdStr)) {
             const selectingUserId = allSelectedCardsInRoom.get(cardIdStr);
             allSelectedCardsInRoom.delete(cardIdStr);
             if (selectingUserId === userId) {
                 localSelectedCardIds.delete(cardIdStr);
                 // roomInfoText.textContent = `Kart ${data.cardId} iptal edildi.`; // Çok sık güncellenmesin diye kaldırdım
             } else {
                 // Başkası kendi seçtiği kartı iptal ettiğinde
                 // roomInfoText.textContent = `Kullanıcı (${selectingUserId.substring(0,3)}...) Kart ${data.cardId} iptal etti.`; // Çok sık güncellenmesin diye kaldırdım
             }
             updateUIForRoom(); // Arayüzü güncelle
        } else {
             console.warn(`Deselect isteği geldi ama kart (${data.cardId}) zaten seçili değil.`);
        }
    });

    // Odadaki Kartlar Sıfırlandı
    socket.on('roomCardsReset', () => {
        allSelectedCardsInRoom.clear();
        localSelectedCardIds.clear();
        updateUIForRoom();
        if(roomInfoText) roomInfoText.textContent = 'Odadaki tüm kart seçimleri sıfırlandı.';
         alert('Odadaki tüm kart seçimleri sıfırlandı.'); // Kullanıcıya belirgin uyarı
    });

     // Kullanıcı Sayısı Güncellemesi (İsteğe bağlı bilgi)
     socket.on('userCountUpdate', (count) => {
         console.log(`Odadaki kullanıcı sayısı güncellendi: ${count}`);
         // İsterseniz bu bilgiyi currentRoomDisplay veya roomInfoText'te gösterebilirsiniz.
          const userCountText = `Kullanıcılar: ${count}/${MAX_USERS_PER_ROOM}`;
          if (currentRoomDisplay && currentRoomDisplay.textContent.includes('Oda:')) { // Eğer oda bilgisi zaten görünüyorsa
               if (currentRoomDisplay.textContent.includes('| Kullanıcılar:')) {
                   currentRoomDisplay.textContent = currentRoomDisplay.textContent.split('|')[0] + '| ' + userCountText;
               } else {
                    currentRoomDisplay.textContent += ' | ' + userCountText;
               }
          } else {
              // Eğer oda bilgisi henüz kurulmadıysa sadece kullanıcı sayısı metnini roomInfoText'e ekleyebiliriz
              if(roomInfoText) roomInfoText.textContent = userCountText;
          }
     });

    // --- Uygulama Başlangıcı ---
    // setInitialUIState(); // Sayfa yüklendiğinde başlangıç durumunu ayarla
    // initializeCards() burada ÇALIŞTIRILMIYOR, çünkü set seçilince veya URL'den odaya girilince çalışacak.
    // updateUIForRoom() da başlangıçta çalışmıyor, çünkü oda bilgisi yok.
    // Sadece socket.on('connect') içinde URL kontrolü veya set seçimi bekleniyor.

    // Sayfa yüklendiğinde Socket.IO bağlantısı kurulur ve 'connect' olayı tetiklenir.
    // 'connect' olayı içinde setInitialUIState() veya URL kontrolü yapılır.

    // Sayfa yüklendiğinde başlangıç durumunu ayarla (Socket.IO bağlanmadan da çalışmalı)
     setInitialUIState(); // <<< Sayfa yüklendiğinde setInitialUIState() çağrılıyor


}); // <<< TÜM DOMContentLoaded BLOĞUNUN KAPANIŞI