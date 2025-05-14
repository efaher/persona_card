document.addEventListener('DOMContentLoaded', () => {
    const cardPool = document.getElementById('card-pool');
    const selectedCardsContainer = document.getElementById('selected-cards');
    const resetButton = document.getElementById('reset-button');
    const selectedCountSpan = document.getElementById('selected-count');
    const infoText = document.getElementById('info-text');
    const noSelectedText = document.getElementById('no-selected-text');

    const TOTAL_CARDS = 77;
    const MAX_SELECTED_CARDS = 10;
    const IMAGE_FOLDER = 'images';
    const IMAGE_EXTENSION = '.jpg';

    let selectedCardsData = new Map(); // DEĞİŞTİRİLDİ: Seçilen kartların ID'sini ve pool'daki orijinal elementini tutar (id -> originalElement)

    // Başlangıçta kartları oluştur
    function initializeCards() {
        for (let i = 1; i <= TOTAL_CARDS; i++) {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.cardId = i;

            const cardNumberSpan = document.createElement('span');
            cardNumberSpan.classList.add('card-number');
            cardNumberSpan.textContent = `${i}`;
            card.appendChild(cardNumberSpan);

            const img = document.createElement('img');
            const imagePath = `${IMAGE_FOLDER}/${i}${IMAGE_EXTENSION}`;
            img.src = imagePath;
            img.alt = `Kart ${i}`;
            img.onerror = () => {
                img.style.display = 'none';
                cardNumberSpan.style.backgroundColor = 'transparent';
                console.warn(`Görsel yüklenemedi: ${imagePath}`);
            };
            card.appendChild(img);

            card.addEventListener('click', handleCardClick);
            cardPool.appendChild(card);
        }
    }

    // Kart havuzundaki karta tıklama işlevi
    function handleCardClick(event) {
        const clickedCardElement = event.currentTarget;
        const cardId = clickedCardElement.dataset.cardId;

        if (clickedCardElement.classList.contains('disabled')) {
            return;
        }

        if (selectedCardsData.size >= MAX_SELECTED_CARDS) {
            alert(`En fazla ${MAX_SELECTED_CARDS} kart seçebilirsiniz.`);
            return;
        }

        selectCard(cardId, clickedCardElement);
    }

    // Kart seçme mantığı
    function selectCard(cardId, originalCardElement) {
        originalCardElement.classList.add('disabled');
        selectedCardsData.set(cardId, originalCardElement); // DEĞİŞTİRİLDİ: Orijinal elementi de sakla

        const selectedClone = originalCardElement.cloneNode(true);
        selectedClone.classList.remove('disabled');
        selectedClone.style.cursor = 'pointer'; // YENİ: Seçilen alandaki kartın da tıklanabilir olduğunu belirt
        selectedClone.removeEventListener('click', handleCardClick); // Havuzdaki tıklama işlevini kaldır
        selectedClone.addEventListener('click', handleSelectedCardClick); // YENİ: Seçilen kartı iptal etme işlevi

        selectedCardsContainer.appendChild(selectedClone);

        if (noSelectedText) {
            noSelectedText.style.display = 'none';
        }
        updateSelectedCount();
    }

    // YENİ: Seçilen alandaki bir karta tıklandığında iptal etme işlevi
    function handleSelectedCardClick(event) {
        const clickedSelectedCard = event.currentTarget;
        const cardId = clickedSelectedCard.dataset.cardId;

        // Seçilen alandan kartı kaldır
        clickedSelectedCard.remove();

        // Havuzdaki orijinal kartı tekrar aktif yap
        if (selectedCardsData.has(cardId)) {
            const originalCardInPool = selectedCardsData.get(cardId);
            if (originalCardInPool) {
                originalCardInPool.classList.remove('disabled');
            }
            selectedCardsData.delete(cardId); // Seçilenler listesinden de kaldır
        }

        // Eğer seçilen kart kalmadıysa "Henüz kart seçilmedi" yazısını göster
        if (selectedCardsData.size === 0 && noSelectedText) {
            noSelectedText.style.display = 'block';
        }

        updateSelectedCount();
    }


    // Seçim sıfırlama işlevi
    function resetSelection() {
        selectedCardsContainer.innerHTML = '';
        if (noSelectedText) {
            selectedCardsContainer.appendChild(noSelectedText);
            noSelectedText.style.display = 'block';
        }

        // DEĞİŞTİRİLDİ: selectedCardsData üzerinden orijinal elementlere ulaş
        selectedCardsData.forEach((originalElement, cardId) => {
            if (originalElement) {
                originalElement.classList.remove('disabled');
            }
        });

        selectedCardsData.clear();
        updateSelectedCount();
    }

    // Seçilen kart sayısını güncelle
    function updateSelectedCount() {
        selectedCountSpan.textContent = selectedCardsData.size; // DEĞİŞTİRİLDİ
        infoText.textContent = `Lütfen en fazla ${MAX_SELECTED_CARDS} kart seçin. Seçilen Kartlar: ${selectedCardsData.size}/${MAX_SELECTED_CARDS}`; // DEĞİŞTİRİLDİ
    }

    resetButton.addEventListener('click', resetSelection);

    initializeCards();
    updateSelectedCount();
});