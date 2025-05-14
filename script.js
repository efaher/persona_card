document.addEventListener('DOMContentLoaded', () => {
    const cardPool = document.getElementById('card-pool');
    const selectedCardsContainer = document.getElementById('selected-cards');
    const resetButton = document.getElementById('reset-button');
    const selectedCountSpan = document.getElementById('selected-count');
    const infoText = document.getElementById('info-text');
    const noSelectedText = document.getElementById('no-selected-text');

    // YENİ: Oda yönetimi için elementler (bunları HTML'e ekleyeceğiz)
    const roomControls = document.createElement('div');
    roomControls.className = 'room-controls';
    const roomIDInput = document.createElement('input');
    roomIDInput.type = 'text';
    roomIDInput.placeholder = 'Oda ID Girin veya Oluşturun';
    const createRoomButton = document.createElement('button');
    createRoomButton.textContent = 'Oda Oluştur/Katıl';
    const currentRoomDisplay = document.createElement('p');
    currentRoomDisplay.className = 'current-room-display';
    currentRoomDisplay.textContent = 'Henüz bir odada değilsiniz.';

    roomControls.appendChild(roomIDInput);
    roomControls.appendChild(createRoomButton);
    document.querySelector('.controls').insertAdjacentElement('afterend', roomControls); // Kontrollerin altına ekle
    document.querySelector('.room-controls').insertAdjacentElement('afterend', currentRoomDisplay);


    const TOTAL_CARDS = 77; // Veya 44, kullandığınız sete göre
    const MAX_SELECTED_CARDS_PER_USER = 10; // Her kullanıcının seçebileceği max kart (Backend'deki genel limitle karıştırmayın)
    const IMAGE_FOLDER = 'images';
    const IMAGE_EXTENSION = '.jpg'; // Veya .png

    const backendUrl = 'https://terapikart.onrender.com'; // SİZİN RENDER URL'NİZ
    const socket = io(backendUrl);

    let currentRoomID = null;
    let localSelectedCardIds = new Set(); // Kullanıcının bu odada seçtiği kartlar
    let allSelectedCardsInRoom = new Map(); // Odadaki tüm seçili kartlar (cardId -> userId)
    let userId = null; // Socket.IO tarafından atanacak kendi ID'miz

    socket.on('connect', () => {
        userId = socket.id;
        console.log('Backend\'e bağlandı! Kullanıcı ID:', userId);
    });

    // Başlangıçta kartları oluştur
    function initializeCards() {
        cardPool.innerHTML = ''; // Önce temizle
        for (let i = 1; i <= TOTAL_CARDS; i++) {
            const card = createCardElement(i);
            card.addEventListener('click', () => handleCardPoolClick(i, card));
            cardPool.appendChild(card);
        }
    }

    function createCardElement(cardId, isSelectedClone = false) {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.cardId = String(cardId);

        const cardNumberSpan = document.createElement('span');
        cardNumberSpan.classList.add('card-number');
        cardNumberSpan.textContent = `${cardId}`;
        card.appendChild(cardNumberSpan);

        const img = document.createElement('img');
        const imagePath = `${IMAGE_FOLDER}/${cardId}${IMAGE_EXTENSION}`;
        img.src = imagePath;
        img.alt = `Kart ${cardId}`;
        img.onerror = () => {
            img.style.display = 'none';
            cardNumberSpan.style.backgroundColor = 'transparent';
        };
        card.appendChild(img);

        if (isSelectedClone) {
            card.style.cursor = 'pointer'; // Seçili alandaki kartın da tıklanabilir olması
            card.addEventListener('click', () => handleSelectedCardClick(cardId, card));
        }
        return card;
    }

    // Kart havuzundaki karta tıklama
    function handleCardPoolClick(cardId, cardElement) {
        if (!currentRoomID) {
            alert('Lütfen önce bir odaya katılın veya oluşturun.');
            return;
        }
        if (cardElement.classList.contains('disabled-in-pool')) { // Başkası tarafından seçilmiş
            alert('Bu kart odada zaten başkası tarafından seçilmiş.');
            return;
        }
         if (cardElement.classList.contains('selected-by-me')) { // Kendim tarafından seçilmiş
            // İptal etme mantığı (aslında seçili alandakine tıklayarak iptal edilecek)
            // handleSelectedCardClick(cardId, cardElement); // Bu mantık seçili alandaki klon için.
            return;
        }

        if (localSelectedCardIds.size >= MAX_SELECTED_CARDS_PER_USER) {
            alert(`Bu odada en fazla ${MAX_SELECTED_CARDS_PER_USER} kart seçebilirsiniz.`);
            return;
        }
        if (allSelectedCardsInRoom.size >= 10 && !allSelectedCardsInRoom.has(String(cardId))) { // Backend'deki genel limit
             alert('Odada en fazla 10 farklı kart seçilebilir.');
             return;
        }


        // Sunucuya kart seçme isteği gönder
        socket.emit('selectCard', { roomID: currentRoomID, cardId: String(cardId) });
    }

    // Seçilen alandaki bir karta tıklama (iptal etmek için)
    function handleSelectedCardClick(cardId, cardElement) {
        if (!currentRoomID) return;

        // Sadece kendi seçtiği kartı iptal edebilir
        if (allSelectedCardsInRoom.get(String(cardId)) === userId) {
            socket.emit('deselectCard', { roomID: currentRoomID, cardId: String(cardId) });
        } else {
            alert("Bu kartı siz seçmediğiniz için iptal edemezsiniz.");
        }
    }

    // Oda oluşturma/katılma
    createRoomButton.addEventListener('click', () => {
        const roomID = roomIDInput.value.trim();
        if (!roomID) {
            alert('Lütfen bir Oda ID girin.');
            return;
        }
        if (currentRoomID === roomID) {
            alert(`Zaten ${roomID} odasındasınız.`);
            return;
        }

        // Önceki odadan ayrıl (varsa)
        if (currentRoomID) {
            socket.emit('leaveRoom', currentRoomID); // Backend'de bu olay için bir handler gerekebilir (disconnect hallediyor olabilir)
        }

        currentRoomID = roomID;
        socket.emit('joinRoom', currentRoomID);
        roomIDInput.value = ''; // Giriş alanını temizle
    });


    // Seçimi Sıfırla Butonu (Odayı sıfırlar)
    resetButton.addEventListener('click', () => {
        if (!currentRoomID) {
            alert('Lütfen önce bir odaya katılın veya oluşturun.');
            return;
        }
        // Sadece adminin sıfırlaması için bir kontrol eklenebilir (backend'de)
        socket.emit('resetRoomCards', currentRoomID);
    });

    function updateUIForRoom() {
        currentRoomDisplay.textContent = `Oda: ${currentRoomID} (Kullanıcı ID: ${userId.substring(0,6)}...)`; // Kendi ID'mizi de gösterelim
        infoText.textContent = `Seçilen Kartlar (Odada Toplam): ${allSelectedCardsInRoom.size}/10`;
        selectedCountSpan.textContent = `${localSelectedCardIds.size}`; // Kişisel seçim sayısı

        // Kart havuzunu güncelle
        const poolCards = cardPool.querySelectorAll('.card');
        poolCards.forEach(card => {
            const cId = card.dataset.cardId;
            card.classList.remove('disabled-in-pool', 'selected-by-me');
            if (allSelectedCardsInRoom.has(cId)) {
                if (allSelectedCardsInRoom.get(cId) === userId) {
                    card.classList.add('selected-by-me'); // Benim seçtiğim
                } else {
                    card.classList.add('disabled-in-pool'); // Başkasının seçtiği
                }
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
             allSelectedCardsInRoom.forEach((selectorUserId, cardId) => {
                const cardClone = createCardElement(cardId, true); // Klon ve tıklanabilir
                if (selectorUserId !== userId) {
                    // Başkasının kartıysa farklı bir işaretleme yapılabilir, şimdilik aynı
                    cardClone.style.borderColor = 'gray'; // Örnek: Başkasının kartı
                }
                selectedCardsContainer.appendChild(cardClone);
            });
        }
    }


    // --- SOCKET.IO OLAYLARI ---
    socket.on('roomFull', () => {
        alert('Bu oda dolu, daha sonra tekrar deneyin.');
        currentRoomID = null; // Oda bağlantısını sıfırla
        roomIDInput.value = '';
        currentRoomDisplay.textContent = 'Oda dolu. Lütfen farklı bir Oda ID deneyin.';
    });

    socket.on('currentSelectedCards', (cards) => {
        // Odaya katıldığımızda mevcut seçili kartları al
        allSelectedCardsInRoom.clear();
        localSelectedCardIds.clear();
        cards.forEach(cardInfo => {
            allSelectedCardsInRoom.set(String(cardInfo.cardId), cardInfo.userId);
            if (cardInfo.userId === userId) {
                localSelectedCardIds.add(String(cardInfo.cardId));
            }
        });
        updateUIForRoom();
    });

    socket.on('cardSelected', (data) => {
        // { cardId, userId }
        allSelectedCardsInRoom.set(String(data.cardId), data.userId);
        if (data.userId === userId) {
            localSelectedCardIds.add(String(data.cardId));
        }
        updateUIForRoom();
    });

    socket.on('cardDeselected', (data) => {
        // { cardId, userId }
        allSelectedCardsInRoom.delete(String(data.cardId));
        if (data.userId === userId) { // Sadece kendi sildiğimizde local listemizden çıkaralım
            localSelectedCardIds.delete(String(data.cardId));
        }
        updateUIForRoom();
    });

    socket.on('roomCardsReset', () => {
        allSelectedCardsInRoom.clear();
        localSelectedCardIds.clear();
        updateUIForRoom();
        alert('Odadaki tüm kart seçimleri sıfırlandı.');
    });

    socket.on('userCountUpdate', (count) => {
        console.log(`Odadaki kullanıcı sayısı güncellendi: ${count}`);
        // İsterseniz bu bilgiyi ekranda bir yerde gösterebilirsiniz.
        // Örneğin: currentRoomDisplay.textContent += ` | Kullanıcılar: ${count}`;
    });

    socket.on('disconnect', () => {
        console.log('Backend ile bağlantı kesildi!');
        currentRoomDisplay.textContent = 'Sunucu ile bağlantı kesildi. Lütfen sayfayı yenileyin.';
        currentRoomID = null; // Bağlantı kesildiğinde odayı da sıfırla
    });

    // Başlat
    initializeCards();
    // updateUIForRoom(); // Başlangıçta oda bilgisi yok
});
