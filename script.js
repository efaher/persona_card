document.addEventListener('DOMContentLoaded', () => {
  const BACKEND_URL = 'https://terapikart.onrender.com';
  const MAX_SELECTED_CARDS = 10;
  const ADVISOR_SESSION_KEY = 'persona-card-advisor-session';

  const cardSets = {
    personita: {
      name: 'Personita Kartları',
      total: 77,
      folder: 'images/personita',
      extension: '.jpg'
    },
    terapi_sb: {
      name: 'Siyah Beyaz Kartlar',
      total: 44,
      folder: 'images/terapi_sb',
      extension: '.jpg'
    }
  };

  const elements = {
    connectionBadge: document.getElementById('connection-badge'),
    advisorStart: document.getElementById('advisor-start'),
    setButtons: Array.from(document.querySelectorAll('.set-card')),
    createSession: document.getElementById('create-session'),
    clientJoining: document.getElementById('client-joining'),
    clientJoiningText: document.getElementById('client-joining-text'),
    sessionPanel: document.getElementById('session-panel'),
    roleLabel: document.getElementById('role-label'),
    sessionTitle: document.getElementById('session-title'),
    sessionStatus: document.getElementById('session-status'),
    roomCode: document.getElementById('room-code'),
    advisorTools: document.getElementById('advisor-tools'),
    inviteLink: document.getElementById('invite-link'),
    copyLink: document.getElementById('copy-link'),
    resetSelection: document.getElementById('reset-selection'),
    closeSession: document.getElementById('close-session'),
    activeSetName: document.getElementById('active-set-name'),
    workspaceInstruction: document.getElementById('workspace-instruction'),
    selectedCount: document.getElementById('selected-count'),
    cardPool: document.getElementById('card-pool'),
    selectedCards: document.getElementById('selected-cards'),
    emptySelection: document.getElementById('empty-selection'),
    toast: document.getElementById('toast')
  };

  const socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling']
  });

  const urlParams = new URLSearchParams(window.location.search);
  const inviteRoomID = urlParams.get('room');
  const inviteToken = urlParams.get('token');
  const isInviteVisit = Boolean(inviteRoomID && inviteToken);

  let selectedSetKey = null;
  let role = null;
  let roomID = null;
  let activeSetKey = null;
  let advisorToken = null;
  let clientToken = null;
  let selectedCards = [];
  let advisorConnected = false;
  let clientConnected = false;
  let toastTimer = null;

  function show(element) {
    element?.classList.remove('hidden');
  }

  function hide(element) {
    element?.classList.add('hidden');
  }

  function showToast(message) {
    if (!elements.toast) return;
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    show(elements.toast);
    toastTimer = setTimeout(() => hide(elements.toast), 3200);
  }

  function setConnectionBadge(status) {
    if (!elements.connectionBadge) return;
    elements.connectionBadge.className = 'badge';
    if (status === 'online') {
      elements.connectionBadge.classList.add('badge-online');
      elements.connectionBadge.textContent = 'Bağlı';
    } else if (status === 'offline') {
      elements.connectionBadge.classList.add('badge-offline');
      elements.connectionBadge.textContent = 'Bağlantı kesildi';
    } else {
      elements.connectionBadge.classList.add('badge-waiting');
      elements.connectionBadge.textContent = 'Bağlanıyor';
    }
  }

  function saveAdvisorSession() {
    if (!roomID || !advisorToken) return;
    sessionStorage.setItem(ADVISOR_SESSION_KEY, JSON.stringify({ roomID, token: advisorToken }));
  }

  function clearAdvisorSession() {
    sessionStorage.removeItem(ADVISOR_SESSION_KEY);
  }

  function getSavedAdvisorSession() {
    try {
      const raw = sessionStorage.getItem(ADVISOR_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      clearAdvisorSession();
      return null;
    }
  }

  function buildClientInviteLink() {
    if (!roomID || !clientToken) return '';
    const inviteUrl = new URL(window.location.href);
    inviteUrl.search = '';
    inviteUrl.hash = '';
    inviteUrl.searchParams.set('room', roomID);
    inviteUrl.searchParams.set('token', clientToken);
    return inviteUrl.toString();
  }

  function resetLocalSession() {
    role = null;
    roomID = null;
    activeSetKey = null;
    advisorToken = null;
    clientToken = null;
    selectedCards = [];
    advisorConnected = false;
    clientConnected = false;
  }

  function showAdvisorStart() {
    resetLocalSession();
    hide(elements.clientJoining);
    hide(elements.sessionPanel);
    show(elements.advisorStart);
  }

  function showClientJoining(message = 'Oturum doğrulanıyor...') {
    hide(elements.advisorStart);
    hide(elements.sessionPanel);
    show(elements.clientJoining);
    if (elements.clientJoiningText) elements.clientJoiningText.textContent = message;
  }

  function applyRoomState(data) {
    if (!data || !data.roomID || !cardSets[data.cardSet]) return;
    roomID = data.roomID;
    activeSetKey = data.cardSet;
    selectedCards = Array.isArray(data.selectedCards) ? data.selectedCards : [];
    advisorConnected = Boolean(data.advisorConnected);
    clientConnected = Boolean(data.clientConnected);
    renderSession();
  }

  function renderSession() {
    if (!roomID || !role || !cardSets[activeSetKey]) return;

    hide(elements.advisorStart);
    hide(elements.clientJoining);
    show(elements.sessionPanel);

    const activeSet = cardSets[activeSetKey];
    elements.roleLabel.textContent = role === 'advisor' ? 'Danışman görünümü' : 'Danışan görünümü';
    elements.sessionTitle.textContent = role === 'advisor' ? 'Kart çalışması oturumu' : 'Size yakın gelen kartları seçin';
    elements.roomCode.textContent = roomID;
    elements.activeSetName.textContent = activeSet.name;
    elements.selectedCount.textContent = String(selectedCards.length);

    if (role === 'advisor') {
      show(elements.advisorTools);
      elements.inviteLink.value = buildClientInviteLink();
      elements.workspaceInstruction.textContent = 'Danışanın seçtiği kartlar ekranınızda eş zamanlı görünür. Kartlara sistem tarafından anlam yüklenmez.';
      elements.sessionStatus.textContent = clientConnected
        ? 'Danışan oturuma bağlı.'
        : 'Danışanın bağlantıdan katılması bekleniyor.';
    } else {
      hide(elements.advisorTools);
      elements.workspaceInstruction.textContent = `Size yakın gelen kartları seçebilirsiniz. En fazla ${MAX_SELECTED_CARDS} kart seçilebilir; seçimlerinizi tekrar tıklayarak kaldırabilirsiniz.`;
      elements.sessionStatus.textContent = advisorConnected
        ? 'Danışman oturuma bağlı.'
        : 'Danışmanın yeniden bağlanması bekleniyor.';
    }

    renderCardPool();
    renderSelectedCards();
  }

  function selectedCardMap() {
    return new Map(selectedCards.map((item) => [String(item.cardId), item]));
  }

  function createCardImage(cardId) {
    const activeSet = cardSets[activeSetKey];
    const img = document.createElement('img');
    img.src = `${activeSet.folder}/${cardId}${activeSet.extension}`;
    img.alt = `${activeSet.name} - Kart ${cardId}`;
    img.loading = 'lazy';
    return img;
  }

  function renderCardPool() {
    const activeSet = cardSets[activeSetKey];
    if (!activeSet || !elements.cardPool) return;

    const selectedMap = selectedCardMap();
    elements.cardPool.innerHTML = '';

    for (let cardId = 1; cardId <= activeSet.total; cardId += 1) {
      const cardIdString = String(cardId);
      const isSelected = selectedMap.has(cardIdString);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.cardId = cardIdString;
      card.setAttribute('aria-label', `Kart ${cardId}`);

      if (isSelected) card.classList.add('selected');
      if (role === 'advisor') {
        card.classList.add('readonly');
        card.tabIndex = -1;
      }

      const number = document.createElement('span');
      number.className = 'card-number';
      number.textContent = cardIdString;
      card.append(number, createCardImage(cardIdString));

      if (role === 'client') {
        card.addEventListener('click', () => {
          if (isSelected) {
            socket.emit('deselectCard', { cardId: cardIdString });
          } else if (selectedCards.length >= MAX_SELECTED_CARDS) {
            showToast(`En fazla ${MAX_SELECTED_CARDS} kart seçebilirsiniz.`);
          } else {
            socket.emit('selectCard', { cardId: cardIdString });
          }
        });
      }

      elements.cardPool.appendChild(card);
    }
  }

  function renderSelectedCards() {
    if (!elements.selectedCards) return;
    elements.selectedCards.innerHTML = '';

    if (selectedCards.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Henüz kart seçilmedi.';
      elements.selectedCards.appendChild(empty);
      return;
    }

    [...selectedCards]
      .sort((a, b) => a.order - b.order)
      .forEach((item) => {
        const wrapper = document.createElement(role === 'client' ? 'button' : 'div');
        if (role === 'client') wrapper.type = 'button';
        wrapper.className = 'card selected-card readonly';
        wrapper.dataset.cardId = String(item.cardId);

        if (role === 'client') {
          wrapper.classList.remove('readonly');
          wrapper.classList.add('client-editable');
          wrapper.setAttribute('aria-label', `Seçim ${item.order}: Kart ${item.cardId}. Seçimi kaldırmak için tıklayın.`);
          wrapper.addEventListener('click', () => socket.emit('deselectCard', { cardId: String(item.cardId) }));
        }

        const number = document.createElement('span');
        number.className = 'card-number';
        number.textContent = String(item.cardId);

        const order = document.createElement('span');
        order.className = 'selection-order';
        order.textContent = `${item.order}. seçim`;

        wrapper.append(number, createCardImage(String(item.cardId)), order);
        elements.selectedCards.appendChild(wrapper);
      });
  }

  elements.setButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedSetKey = button.dataset.set;
      elements.setButtons.forEach((item) => item.classList.toggle('selected', item === button));
      elements.createSession.disabled = !selectedSetKey || !socket.connected;
    });
  });

  elements.createSession.addEventListener('click', () => {
    if (!selectedSetKey || !socket.connected) return;
    elements.createSession.disabled = true;
    elements.createSession.textContent = 'Oturum oluşturuluyor...';
    socket.emit('createRoom', { cardSet: selectedSetKey });
  });

  elements.copyLink.addEventListener('click', async () => {
    const link = elements.inviteLink.value;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Danışan bağlantısı kopyalandı.');
    } catch {
      elements.inviteLink.select();
      document.execCommand('copy');
      showToast('Danışan bağlantısı kopyalandı.');
    }
  });

  elements.resetSelection.addEventListener('click', () => {
    socket.emit('resetRoomCards');
  });

  elements.closeSession.addEventListener('click', () => {
    socket.emit('closeRoom');
  });

  socket.on('connect', () => {
    setConnectionBadge('online');
    elements.createSession.disabled = !selectedSetKey;

    if (isInviteVisit) {
      showClientJoining();
      socket.emit('joinRoom', { roomID: inviteRoomID, token: inviteToken });
      return;
    }

    const savedSession = getSavedAdvisorSession();
    if (savedSession?.roomID && savedSession?.token) {
      socket.emit('joinRoom', savedSession);
      return;
    }

    showAdvisorStart();
  });

  socket.on('disconnect', () => {
    setConnectionBadge('offline');
    elements.createSession.disabled = true;
    if (elements.sessionStatus && roomID) {
      elements.sessionStatus.textContent = 'Sunucu bağlantısı kesildi. Yeniden bağlanılıyor...';
    }
  });

  socket.on('roomCreated', (data) => {
    role = 'advisor';
    advisorToken = data.advisorToken;
    clientToken = data.clientToken;
    elements.createSession.textContent = 'Oturum Oluştur';
    elements.createSession.disabled = false;
    applyRoomState(data);
    saveAdvisorSession();
    if (elements.inviteLink) elements.inviteLink.value = buildClientInviteLink();
    showToast('Oturum oluşturuldu. Danışan bağlantısını paylaşabilirsiniz.');
  });

  socket.on('joinedRoom', (data) => {
    role = data.role;
    if (role === 'advisor') {
      const saved = getSavedAdvisorSession();
      advisorToken = saved?.token || null;
    }
    applyRoomState(data);
  });

  socket.on('roomState', (data) => {
    if (roomID && data.roomID !== roomID) return;
    applyRoomState(data);
  });

  socket.on('roomClosed', () => {
    const wasAdvisor = role === 'advisor';
    if (wasAdvisor) clearAdvisorSession();
    resetLocalSession();

    if (isInviteVisit || !wasAdvisor) {
      showClientJoining('Bu kart çalışması danışman tarafından kapatıldı.');
    } else {
      showAdvisorStart();
      showToast('Oturum kapatıldı.');
    }
  });

  socket.on('sessionError', ({ code, message } = {}) => {
    const text = message || 'Oturum sırasında bir hata oluştu.';
    showToast(text);

    if (isInviteVisit) {
      showClientJoining(text);
      return;
    }

    if (['ROOM_NOT_FOUND', 'INVALID_TOKEN'].includes(code)) {
      clearAdvisorSession();
      showAdvisorStart();
    }

    elements.createSession.textContent = 'Oturum Oluştur';
    elements.createSession.disabled = !selectedSetKey || !socket.connected;
  });

  setConnectionBadge('waiting');
  if (isInviteVisit) {
    showClientJoining();
  } else {
    show(elements.advisorStart);
  }
});
