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

    // YENİ: Kart Seti Bilgileri
    const cardSets = {
        personita: { name: 'Personita Kartları', total: 77, folder: 'images/personita', extension: '.jpg' },
        terapi_sb: { name: 'Siyah Beyaz Terapi Kartları', total: 44, folder: 'images/terapi_sb', extension: '.jpg' }
    };
    let activeCardSet = null; // Kullanıcının seçtiği aktif kart seti objesi

    let localSelectedCardIds = new Set(); // Bu kullanıcının odada seçtiği kart ID'leri (string)
    let allSelectedCardsInRoom = new Map(); // Odadaki tüm seçili kartlar (cardId:string -> userId:string)
    const MAX_SELECTED_CARDS_PER_ROOM = 10; // Odada toplam seçilebilecek max farklı kart sayısı

    // --- Başlangıç Durumu ---
    // Varsayılan olarak sadece kart seti seçimi görünür olacak, diğer alanlar gizlenecek
    // Kullanıcı giriş yaptıktan sonra (Faz 2) burası değişecek
    // Şimdilik: Giriş alanı pasif (placeholder), kart seti seçimi görünür, oda kontrolleri ve kart alanları gizli
    userAuthControls.style.display = 'block'; // Placeholder'ı göster
    cardSetSelectionArea.style.display = 'block'; // Kart seti seçimini göster
    //roomControlsArea.style.display = 'none'; // Oda kontrollerini gizle
    //document.querySelector('.controls').style.display = 'none'; // Reset butonu ve bilgi metnini gizle
    //cardPool.style.display = 'none'; // Kart havuzunu gizle
    //selectedCardsContainer.parentElement.style.display = 'none'; // Seçilen kartlar başlığını ve alanı gizle


    // --- Socket.IO Bağlantı Olayları ---
    socket.on('connect', () => {
        userId = socket.id;
        console.log('Backend\'e bağlandı! Kullanıcı ID:', userId);
        // Bağlantı kurulduğunda, eğer URL'de oda ID varsa direkt katılmayı dene
        const urlParams = new URLSearchParams(window.location.search);
        const roomIDFromUrl = urlParams.get('oda'); // index.html?oda=ODA_IDSI
        if (roomIDFromUrl) {
            // URL'den oda ID geldiyse, kullanıcıdan kart seti seçmesini beklemeden katılmayı dene
            // Ancak hangi kart setini yükleyeceğini bilmesi lazım, bu bilgiyi backend göndermeli.
            // MVP için şimdilik: URL'den gelen sadece danışan için, danışan set seçmez.
            // Danışan direk odaya katılır ve backend hangi set olduğunu söyler.
            // Danışman ise set seçip odayı öyle kurar.
            // Şimdilik basit bir ayrım yapalım: Eğer URL'de oda varsa, kart seti seçimi gizlenir.
            cardSetSelectionArea.style.display = 'none'; // Danışan set seçmez
            userAuthControls.style.display = 'none'; // Danışan için auth placeholder'ı gizle
            roomControlsArea.style.display = 'block'; // Oda kontrollerini göster (Sadece görüntü amaçlı, input gizlenebilir)
            roomIdInput.style.display = 'none'; // Oda ID inputunu gizle
            createJoinRoomButton.style.display = 'none'; // Oda oluştur/katıl butonunu gizle
            currentRoomDisplay.textContent = `Oda: ${roomIDFromUrl} (Bağlanıyor...)`;
            roomInfoText.textContent = 'Odaya katılıyor...';
            document.querySelector('.controls').style.display = 'block'; // Kontrolleri göster
            selectedCardsContainer.parentElement.style.display = 'block'; // Seçilenler alanını göster
            cardPool.style.display = 'flex'; // Kart havuzunu göster

            // Oda ID'si ile katılma isteği gönder (Kart seti bilgisi backend'den gelecek)
            socket.emit('joinRoom', { roomID: roomIDFromUrl });

        } else {
             // URL'de oda ID yoksa (bu muhtemelen danışman veya ilk giriş yapan kullanıcı)
             // Kart seti seçimi görünür kalır, diğer her şey gizlidir (Zaten yukarıda yapıldı).
        }
    });

    socket.on('disconnect', () => {
        console.log('Backend ile bağlantı kesildi!');
        currentRoomDisplay.textContent = 'Sunucu ile bağlantı kesildi. Lütfen sayfayı yenileyin.';
        // Arayüzü bağlantı kesildiğini belirtecek şekilde güncelle
        roomControlsArea.style.display = 'block'; // Bilgiyi göstermek için
        roomIdInput.style.display = 'none';
        createJoinRoomButton.style.display = 'none';
        cardPool.style.display = 'none';
        selectedCardsContainer.parentElement.style.display = 'none';
        document.querySelector('.controls').style.display = 'none';
        selectSetPrompt.textContent = 'Bağlantı kesildi.';
        activeCardSetNameDisplay.textContent = 'Bağlantı Yok';
        allSelectedCardsInRoom.clear();
        localSelectedCardIds.clear();
        updateUIForRoom(); // Arayüzü sıfırla
    });

    // --- Kart Seti Seçimi Mantığı ---
    selectSetButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!socket.connected) {
                alert('Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin veya sayfayı yenileyin.');
                return;
            }

            const selectedSet = button.dataset.setname;
            activeCardSet = cardSets[selectedSet];

            if (activeCardSet) {
                console.log('Kart seti seçildi:', activeCardSet.name);

                // Arayüzü güncelle: Kart seti seçimi alanını gizle, oda kontrollerini göster
                cardSetSelectionArea.style.display = 'none';
                userAuthControls.style.display = 'none'; // Giriş alanı da set seçilince gizlensin şimdilik
                roomControlsArea.style.display = 'block';
                document.querySelector('.controls').style.display = 'block'; // Reset butonu ve bilgi metnini göster
                cardPool.style.display = 'flex'; // Kart havuzunu göster
                selectedCardsContainer.parentElement.style.display = 'block'; // Seçilenler alanını göster

                activeCardSetNameDisplay.textContent = activeCardSet.name; // Başlıktaki adı güncelle
                selectSetPrompt.style.display = 'none'; // Placeholder metni gizle

                // Kartları Yükle (Seçilen Sete Göre)
                initializeCards();

                // Oda ID inputuna odaklan
                roomIdInput.focus();

            } else {
                console.error('Bilinmeyen kart seti seçildi:', selectedSet);
            }
        });
    });

    // --- Kart Oluşturma Fonksiyonu ---
    function createCardElement(cardId, isSelectedClone = false) {
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
            img.style.display = 'none'; // Kırık resim ikonunu gizle
            cardNumberSpan.style.backgroundColor = 'transparent'; // Numarayı daha belirgin yap
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
            selectSetPrompt.style.display = 'block';
             cardPool.innerHTML = ''; // Kart havuzunu temizle
            cardPool.appendChild(selectSetPrompt); // Placeholder'ı geri koy
            activeCardSetNameDisplay.textContent = 'Kart Seti Seçilmedi';
            return;
        }
        cardPool.innerHTML = ''; // Kart havuzunu temizle
        selectSetPrompt.style.display = 'none'; // Placeholder'ı gizle

        const TOTAL_CARDS = activeCardSet.total; // Aktif setin toplam kart sayısı

        for (let i = 1; i <= TOTAL_CARDS; i++) {
            const card = createCardElement(i);
            card.addEventListener('click', () => handleCardPoolClick(i, card));
            cardPool.appendChild(card);
        }
        // Oda bilgisi varsa, kartları yükledikten sonra UI'ı güncelle
        // Bu, odaya katıldığımızda backend'den gelen selectedCards bilgisini işler
        if(currentRoomID) {
             updateUIForRoom();
        }
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
             // Eğer yanlışlıkla kendi seçtiği karta havuzda tekrar tıklarsa
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

        currentRoomID = roomID;
        // Oda ID ve Seçilen Kart Seti bilgisi ile katılma isteği gönder
        socket.emit('joinRoom', { roomID: currentRoomID, cardSet: activeCardSet.name });

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
        socket.emit('resetRoomCards', currentRoomID);
        roomInfoText.textContent = 'Kartlar sıfırlanıyor...';
    });

    // --- Arayüz Güncelleme Fonksiyonu ---
    function updateUIForRoom() {
        // Kart havuzunu güncelle
        const poolCards = cardPool.querySelectorAll('.card');
        poolCards.forEach(card => {
            const cId = card.dataset.cardId;
            card.classList.remove('disabled-in-pool', 'selected-by-me'); // Önceki durumları temizle

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

                 if (selectorUserId !== userId) {
                     // Başkasının kartıysa farklı bir işaretleme/stil yapılabilir
                     // cardClone.style.borderColor = 'gray'; // Örnek: Başkasının kartı
                     cardClone.classList.add('selected-by-other'); // Yeni class
                     cardClone.querySelector('.card-number').textContent += ` (${selectorUserId.substring(0,3)}...)`; // Kimin seçtiğini göster (opsiyonel)
                 } else {
                     cardClone.classList.add('selected-by-me'); // Benim seçtiğim klon
                 }
                 selectedCardsContainer.appendChild(cardClone);
            });
        }

        // Bilgi metinlerini güncelle
        selectedCountSpan.textContent = allSelectedCardsInRoom.size; // Odada toplam seçilen kart sayısı
        infoText.textContent = `Seçilen Kartlar (Odada Toplam): ${allSelectedCardsInRoom.size}/${MAX_SELECTED_CARDS_PER_ROOM}`;
        currentRoomDisplay.textContent = `Oda: "${currentRoomID}" (ID: ${userId.substring(0,6)}...)`;
        roomInfoText.textContent = `Kişisel Seçimler: ${localSelectedCardIds.size}/${MAX_SELECTED_CARDS_PER_USER}`; // Kişisel limiti de göster
    }


    // --- SOCKET.IO OLAY DİNLEYİCİLERİ (Backend'den Gelen Mesajlar) ---

    // Odaya Katılım Başarılı Oldu (Backend'den Gelen Mevcut Durum)
    socket.on('currentSelectedCards', (data) => {
        // data şuna benzer: { cardSet: 'personita', selectedCards: [{cardId, userId}, ...], userCount: 1 }
        console.log('Odaya Katılım Başarılı.', data);

        if (!data.cardSet || !cardSets[data.cardSet]) {
             console.error('Backend\'den geçersiz kart seti bilgisi geldi:', data.cardSet);
             roomInfoText.textContent = 'Hata: Geçersiz oda bilgisi.';
             socket.emit('leaveRoom', currentRoomID); // Hatalı odayı terk et
             currentRoomID = null;
             // Arayüzü başlangıç durumuna döndür
             userAuthControls.style.display = 'block';
             cardSetSelectionArea.style.display = 'block';
             roomControlsArea.style.display = 'none';
             document.querySelector('.controls').style.display = 'none';
             cardPool.style.display = 'none';
             selectedCardsContainer.parentElement.style.display = 'none';
             initializeCards(); // Kart havuzunu temizler
             return;
        }

         // Oda bilgisi ve kullanıcı ID'sini sakla (zaten connect'te alınıyor userId)
         currentRoomID = data.roomID; // Backend'den gelen teyitli oda ID'si
         activeCardSet = cardSets[data.cardSet]; // Backend'in belirlediği aktif set

         // Arayüzü odaya uygun hale getir
         userAuthControls.style.display = 'none'; // Giriş alanı (şimdilik) gizle
         cardSetSelectionArea.style.display = 'none'; // Set seçimi gizle
         roomControlsArea.style.display = 'block'; // Oda kontrollerini göster
         document.querySelector('.controls').style.display = 'block'; // Reset butonu vs göster
         cardPool.style.display = 'flex'; // Kart havuzunu göster
         selectedCardsContainer.parentElement.style.display = 'block'; // Seçilenler alanını göster

         activeCardSetNameDisplay.textContent = activeCardSet.name; // Başlıktaki adı güncelle
         selectSetPrompt.style.display = 'none'; // Placeholder gizle

         // Kartları doğru set'e göre yükle
         initializeCards(); // initializeCards'ın sonu updateUIForRoom'u çağırır

         // Mevcut seçili kartları işle
         allSelectedCardsInRoom.clear();
         localSelectedCardIds.clear();
         data.selectedCards.forEach(cardInfo => {
             allSelectedCardsInRoom.set(String(cardInfo.cardId), cardInfo.userId);
             if (cardInfo.userId === userId) {
                 localSelectedCardIds.add(String(cardInfo.cardId));
             }
         });

        updateUIForRoom(); // Arayüzü mevcut duruma göre güncelle
        roomInfoText.textContent = `Odaya başarıyla katıldınız. Kullanıcılar: ${data.userCount}/${MAX_USERS_PER_ROOM}`; // Backend'deki max user sayısı

        // Danışman ise davet linkini gösterme/kopyalama butonu eklenebilir burada
        // if (isTherapist) { ... Davet linki butonu mantığı ... }
    });

    // Oda Dolu Hatası
    socket.on('roomFull', () => {
        alert('Bu oda dolu (' + MAX_USERS_PER_ROOM + ' kişi). Lütfen farklı bir Oda ID deneyin.');
        console.warn('Oda dolu hatası alındı.');
        currentRoomID = null; // Oda bağlantısını sıfırla
        roomIdInput.value = '';
        currentRoomDisplay.textContent = 'Oda dolu.';
        roomInfoText.textContent = 'Lütfen farklı bir Oda ID girin.';
        // Arayüzü başlangıç durumuna döndür
         userAuthControls.style.display = 'block';
         cardSetSelectionArea.style.display = 'block';
         roomControlsArea.style.display = 'none';
         document.querySelector('.controls').style.display = 'none';
         cardPool.style.display = 'none';
         selectedCardsContainer.parentElement.style.display = 'none';
          selectSetPrompt.textContent = 'Oda dolu. Lütfen farklı bir kart seti seçin veya yeni oda deneyin.';
         initializeCards(); // Kart havuzunu temizler
         activeCardSet = null; // Aktif seti sıfırla
         activeCardSetNameDisplay.textContent = 'Kart Seti Seçilmedi';
    });

    // Başka Kullanıcıdan Kart Seçildi/Kendi Seçimim Onaylandı
    socket.on('cardSelected', (data) => { // { cardId, userId }
        const cardIdStr = String(data.cardId);
        allSelectedCardsInRoom.set(cardIdStr, data.userId);
        if (data.userId === userId) {
            localSelectedCardIds.add(cardIdStr);
             roomInfoText.textContent = `Kart ${data.cardId} seçildi.`; // Kendi seçtiğinde bilgi ver
        } else {
             roomInfoText.textContent = `Kullanıcı (${data.userId.substring(0,3)}...) Kart ${data.cardId} seçti.`; // Başkasının seçimini haber ver
        }
        updateUIForRoom();
    });

    // Başka Kullanıcıdan Kart İptal Edildi/Kendi İptalim Onaylandı
    socket.on('cardDeselected', (data) => { // { cardId, userId }
        const cardIdStr = String(data.cardId);
        if (allSelectedCardsInRoom.has(cardIdStr)) {
             const selectingUserId = allSelectedCardsInRoom.get(cardIdStr);
             allSelectedCardsInRoom.delete(cardIdStr);
             if (selectingUserId === userId) {
                 localSelectedCardIds.delete(cardIdStr);
                 roomInfoText.textContent = `Kart ${data.cardId} iptal edildi.`; // Kendi iptal ettiğinde bilgi ver
             } else {
                 // Başkası kendi seçtiği kartı iptal ettiğinde
                 roomInfoText.textContent = `Kullanıcı (${selectingUserId.substring(0,3)}...) Kart ${data.cardId} iptal etti.`; // Başkasının iptalini haber ver
             }
             updateUIForRoom();
        } else {
             console.warn(`Deselect isteği geldi ama kart (${data.cardId}) zaten seçili değil.`);
        }
    });

    // Odadaki Kartlar Sıfırlandı
    socket.on('roomCardsReset', () => {
        allSelectedCardsInRoom.clear();
        localSelectedCardIds.clear();
        updateUIForRoom();
        roomInfoText.textContent = 'Odadaki tüm kart seçimleri sıfırlandı.';
         alert('Odadaki tüm kart seçimleri sıfırlandı.'); // Kullanıcıya belirgin uyarı
    });

     // Kullanıcı Sayısı Güncellemesi (İsteğe bağlı bilgi)
     socket.on('userCountUpdate', (count) => {
         console.log(`Odadaki kullanıcı sayısı güncellendi: ${count}`);
         // İsterseniz bu bilgiyi currentRoomDisplay veya roomInfoText'te gösterebilirsiniz.
         // Örnek: currentRoomDisplay.textContent = `Oda: "${currentRoomID}" | Kullanıcılar: ${count}/${MAX_USERS_PER_ROOM}`;
     });

    // --- Uygulama Başlangıcı ---
    // initializeCards() burada ÇALIŞTIRILMIYOR, çünkü set seçilince veya URL'den odaya girilince çalışacak.
    // updateUIForRoom() da başlangıçta çalışmıyor, çünkü oda bilgisi yok.
    // Sadece socket.on('connect') içinde URL kontrolü veya set seçimi bekleniyor.

     // URL'de oda ID yoksa, kart seti seçim alanının varsayılan olarak görünür olduğundan emin ol (CSS/JS ile)
     // connect olayında bu mantık var.

});