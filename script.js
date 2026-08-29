document.addEventListener('DOMContentLoaded', () => {
  const BACKEND_URL = 'https://terapikart.onrender.com';
  const MAX_SELECTED_CARDS = 10;
  const ADVISOR_SESSION_KEY = 'persona-card-advisor-session';
  const CLIENT_INVITE_KEY = 'persona-card-client-invite';
  const AUTH_TOKEN_KEY = 'persona-card-auth-token';
  const ADVISOR_CACHE_KEY = 'persona-card-advisor-cache';
  const CARD_CACHE_NAME = 'persona-card-cards-v1.2';

  const cardSets = {
    personita: { name: 'Personita Kartları', total: 77, folder: 'images/personita', extension: '.jpg' },
    terapi_sb: { name: 'Siyah Beyaz Kartlar', total: 44, folder: 'images/terapi_sb', extension: '.jpg' }
  };

  const elements = {
    connectionBadge: document.getElementById('connection-badge'),
    authPanel: document.getElementById('auth-panel'),
    showLogin: document.getElementById('show-login'),
    showRegister: document.getElementById('show-register'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    registerName: document.getElementById('register-name'),
    registerEmail: document.getElementById('register-email'),
    registerPassword: document.getElementById('register-password'),
    authMessage: document.getElementById('auth-message'),
    advisorStart: document.getElementById('advisor-start'),
    advisorName: document.getElementById('advisor-name'),
    accountStatus: document.getElementById('account-status'),
    logoutButton: document.getElementById('logout-button'),
    trialTitle: document.getElementById('trial-title'),
    trialDescription: document.getElementById('trial-description'),
    trialCount: document.getElementById('trial-count'),
    licenseMessage: document.getElementById('license-message'),
    installApp: document.getElementById('install-app'),
    prepareOffline: document.getElementById('prepare-offline'),
    offlineStatus: document.getElementById('offline-status'),
    openOffline: document.getElementById('open-offline'),
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
    offlineTools: document.getElementById('offline-tools'),
    inviteLink: document.getElementById('invite-link'),
    copyLink: document.getElementById('copy-link'),
    resetSelection: document.getElementById('reset-selection'),
    closeSession: document.getElementById('close-session'),
    offlineReset: document.getElementById('offline-reset'),
    offlineClose: document.getElementById('offline-close'),
    activeSetName: document.getElementById('active-set-name'),
    workspaceInstruction: document.getElementById('workspace-instruction'),
    selectedCount: document.getElementById('selected-count'),
    cardPool: document.getElementById('card-pool'),
    selectedCards: document.getElementById('selected-cards'),
    toast: document.getElementById('toast')
  };

  const socket = typeof window.io === 'function'
    ? window.io(BACKEND_URL, { transports: ['websocket', 'polling'] })
    : null;

  function readSavedClientInvite() {
    try {
      const raw = sessionStorage.getItem(CLIENT_INVITE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      sessionStorage.removeItem(CLIENT_INVITE_KEY);
      return null;
    }
  }

  const inviteHash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const hashRoomID = String(inviteHash.get('room') || '').trim().toUpperCase();
  const hashToken = String(inviteHash.get('token') || '').trim();

  if (hashRoomID && hashToken) {
    sessionStorage.setItem(CLIENT_INVITE_KEY, JSON.stringify({ roomID: hashRoomID, token: hashToken }));
    const scrubbedUrl = new URL(window.location.href);
    scrubbedUrl.hash = `room=${encodeURIComponent(hashRoomID)}`;
    window.history.replaceState(null, document.title, scrubbedUrl.toString());
  }

  const savedClientInvite = readSavedClientInvite();
  const inviteRoomID = hashRoomID || String(savedClientInvite?.roomID || '').trim().toUpperCase();
  const inviteToken = hashToken || String(savedClientInvite?.token || '').trim();
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
  let localOrder = 1;
  let toastTimer = null;
  let deferredInstallPrompt = null;
  let authToken = localStorage.getItem(AUTH_TOKEN_KEY);
  let advisor = readCachedAdvisor();

  const show = (element) => element?.classList.remove('hidden');
  const hide = (element) => element?.classList.add('hidden');

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
      elements.connectionBadge.textContent = 'Çevrimiçi';
    } else if (status === 'offline') {
      elements.connectionBadge.classList.add('badge-offline');
      elements.connectionBadge.textContent = 'Çevrimdışı';
    } else {
      elements.connectionBadge.classList.add('badge-waiting');
      elements.connectionBadge.textContent = 'Bağlanıyor';
    }
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const response = await fetch(`${BACKEND_URL}${path}`, { ...options, headers });
    let data = {};
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) {
      const error = new Error(data.message || 'İşlem tamamlanamadı.');
      error.code = data.code;
      error.retryAfterSeconds = data.retryAfterSeconds;
      throw error;
    }
    return data;
  }

  function setAuthMode(mode) {
    const login = mode === 'login';
    elements.showLogin.classList.toggle('active', login);
    elements.showRegister.classList.toggle('active', !login);
    elements.loginForm.classList.toggle('hidden', !login);
    elements.registerForm.classList.toggle('hidden', login);
    elements.authMessage.textContent = '';
  }

  function readCachedAdvisor() {
    try {
      const raw = localStorage.getItem(ADVISOR_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem(ADVISOR_CACHE_KEY);
      return null;
    }
  }

  function cacheAdvisor(currentAdvisor) {
    if (!currentAdvisor) return;
    localStorage.setItem(ADVISOR_CACHE_KEY, JSON.stringify(currentAdvisor));
  }

  function saveAuth(data) {
    authToken = data.token;
    advisor = data.advisor;
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    cacheAdvisor(advisor);
  }

  function clearAuth() {
    authToken = null;
    advisor = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ADVISOR_CACHE_KEY);
    sessionStorage.removeItem(ADVISOR_SESSION_KEY);
  }

  function paidPlanActive(currentAdvisor) {
    return Boolean(
      currentAdvisor?.plan === 'annual'
      && currentAdvisor?.licenseUntil
      && new Date(currentAdvisor.licenseUntil).getTime() > Date.now()
    );
  }

  function hasOnlineCredit() {
    return paidPlanActive(advisor) || Number(advisor?.trialSessionsRemaining || 0) > 0;
  }

  function updateLaunchButtons() {
    elements.createSession.disabled = !selectedSetKey || !socket?.connected || !hasOnlineCredit();
    elements.openOffline.disabled = !selectedSetKey || !paidPlanActive(advisor);
  }

  function updateAdvisorUi() {
    if (!advisor) return;
    elements.advisorName.textContent = `${advisor.displayName}, kart çalışması başlatın`;
    elements.accountStatus.textContent = advisor.email;
    elements.licenseMessage.textContent = '';

    if (paidPlanActive(advisor)) {
      elements.trialTitle.textContent = 'Yıllık Profesyonel Lisans';
      elements.trialDescription.textContent = `Bakım ve çevrimiçi hizmet dönemi: ${new Date(advisor.licenseUntil).toLocaleDateString('tr-TR')} tarihine kadar.`;
      elements.trialCount.textContent = '✓';
    } else {
      const remaining = Number(advisor.trialSessionsRemaining || 0);
      elements.trialTitle.textContent = remaining > 0 ? 'Ücretsiz deneme' : 'Ücretsiz kullanım tamamlandı';
      elements.trialDescription.textContent = remaining > 0
        ? 'Her yeni çevrimiçi kart çalışması bir kullanım hakkı tüketir.'
        : 'Yeni çalışma başlatmak için yıllık Persona Card lisansının etkinleştirilmesi gerekir.';
      elements.trialCount.textContent = String(remaining);
    }

    updateLaunchButtons();
  }

  function saveAdvisorSession() {
    if (!roomID || !advisorToken) return;
    sessionStorage.setItem(ADVISOR_SESSION_KEY, JSON.stringify({ roomID, token: advisorToken }));
  }

  function getSavedAdvisorSession() {
    try {
      const raw = sessionStorage.getItem(ADVISOR_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      sessionStorage.removeItem(ADVISOR_SESSION_KEY);
      return null;
    }
  }

  function buildClientInviteLink() {
    if (!roomID || !clientToken) return '';
    const inviteUrl = new URL(window.location.href);
    inviteUrl.search = '';
    inviteUrl.hash = '';
    const fragment = new URLSearchParams();
    fragment.set('room', roomID);
    fragment.set('token', clientToken);
    inviteUrl.hash = fragment.toString();
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
    localOrder = 1;
  }

  function showAuthPanel() {
    resetLocalSession();
    hide(elements.advisorStart);
    hide(elements.clientJoining);
    hide(elements.sessionPanel);
    show(elements.authPanel);
  }

  function showAdvisorStart() {
    resetLocalSession();
    hide(elements.authPanel);
    hide(elements.clientJoining);
    hide(elements.sessionPanel);
    if (!advisor) return showAuthPanel();
    updateAdvisorUi();
    show(elements.advisorStart);
  }

  function showClientJoining(message = 'Oturum doğrulanıyor...') {
    hide(elements.authPanel);
    hide(elements.advisorStart);
    hide(elements.sessionPanel);
    show(elements.clientJoining);
    elements.clientJoiningText.textContent = message;
  }

  async function restoreAdvisorAccount() {
    if (!authToken) {
      advisor = readCachedAdvisor();
      return Boolean(advisor);
    }

    try {
      const data = await api('/api/me');
      advisor = data.advisor;
      cacheAdvisor(advisor);
      return true;
    } catch (error) {
      if (error.code === 'UNAUTHORIZED') {
        clearAuth();
        return false;
      }
      advisor = readCachedAdvisor();
      return Boolean(advisor);
    }
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
    hide(elements.authPanel);
    hide(elements.advisorStart);
    hide(elements.clientJoining);
    show(elements.sessionPanel);

    const activeSet = cardSets[activeSetKey];
    elements.activeSetName.textContent = activeSet.name;
    elements.selectedCount.textContent = String(selectedCards.length);

    if (role === 'advisor') {
      elements.roleLabel.textContent = 'Danışman görünümü';
      elements.sessionTitle.textContent = 'Çevrimiçi kart çalışması';
      elements.roomCode.textContent = roomID;
      show(elements.advisorTools);
      hide(elements.offlineTools);
      elements.inviteLink.value = buildClientInviteLink();
      elements.workspaceInstruction.textContent = 'Danışanın seçtiği kartlar ekranınızda eş zamanlı görünür. Kartlara sistem tarafından anlam yüklenmez.';
      elements.sessionStatus.textContent = clientConnected ? 'Danışan oturuma bağlı.' : 'Danışanın bağlantıdan katılması bekleniyor.';
    } else if (role === 'client') {
      elements.roleLabel.textContent = 'Danışan';
      elements.sessionTitle.textContent = 'Size yakın gelen kartları seçin';
      elements.roomCode.textContent = roomID;
      hide(elements.advisorTools);
      hide(elements.offlineTools);
      elements.workspaceInstruction.textContent = `Size yakın gelen kartları seçebilirsiniz. En fazla ${MAX_SELECTED_CARDS} kart seçilebilir; seçimlerinizi tekrar tıklayarak kaldırabilirsiniz.`;
      elements.sessionStatus.textContent = advisorConnected ? 'Danışman oturuma bağlı.' : 'Danışmanın yeniden bağlanması bekleniyor.';
    } else {
      elements.roleLabel.textContent = 'Cihaz modu';
      elements.sessionTitle.textContent = 'Kart galerisi';
      elements.roomCode.textContent = 'CİHAZ';
      hide(elements.advisorTools);
      show(elements.offlineTools);
      elements.workspaceInstruction.textContent = 'Kartları bu cihaz üzerinde seçip yüz yüze görüşmede kullanabilirsiniz. Bu mod danışana bağlantı göndermez.';
      elements.sessionStatus.textContent = 'Çevrimdışı kullanılabilir yerel çalışma.';
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

  function toggleLocalCard(cardId) {
    const key = String(cardId);
    const existing = selectedCards.find((item) => String(item.cardId) === key);
    if (existing) {
      selectedCards = selectedCards
        .filter((item) => String(item.cardId) !== key)
        .map((item, index) => ({ ...item, order: index + 1 }));
      localOrder = selectedCards.length + 1;
    } else if (selectedCards.length < MAX_SELECTED_CARDS) {
      selectedCards.push({ cardId: key, order: localOrder++ });
    } else {
      showToast(`En fazla ${MAX_SELECTED_CARDS} kart seçebilirsiniz.`);
    }
    renderSession();
  }

  function renderCardPool() {
    const activeSet = cardSets[activeSetKey];
    if (!activeSet) return;
    const selectedMap = selectedCardMap();
    elements.cardPool.innerHTML = '';

    for (let cardId = 1; cardId <= activeSet.total; cardId += 1) {
      const id = String(cardId);
      const isSelected = selectedMap.has(id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.cardId = id;
      card.setAttribute('aria-label', `Kart ${id}`);
      if (isSelected) card.classList.add('selected');
      if (role === 'advisor') {
        card.classList.add('readonly');
        card.tabIndex = -1;
      }

      const number = document.createElement('span');
      number.className = 'card-number';
      number.textContent = id;
      card.append(number, createCardImage(id));

      if (role === 'client') {
        card.addEventListener('click', () => {
          if (isSelected) socket?.emit('deselectCard', { cardId: id });
          else if (selectedCards.length >= MAX_SELECTED_CARDS) showToast(`En fazla ${MAX_SELECTED_CARDS} kart seçebilirsiniz.`);
          else socket?.emit('selectCard', { cardId: id });
        });
      } else if (role === 'offline') {
        card.addEventListener('click', () => toggleLocalCard(id));
      }

      elements.cardPool.appendChild(card);
    }
  }

  function renderSelectedCards() {
    elements.selectedCards.innerHTML = '';
    if (selectedCards.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Henüz kart seçilmedi.';
      elements.selectedCards.appendChild(empty);
      return;
    }

    [...selectedCards].sort((a, b) => a.order - b.order).forEach((item) => {
      const editable = role === 'client' || role === 'offline';
      const wrapper = document.createElement(editable ? 'button' : 'div');
      if (editable) wrapper.type = 'button';
      wrapper.className = 'card selected-card readonly';
      if (editable) {
        wrapper.classList.remove('readonly');
        wrapper.classList.add('client-editable');
        wrapper.addEventListener('click', () => {
          if (role === 'client') socket?.emit('deselectCard', { cardId: String(item.cardId) });
          else toggleLocalCard(String(item.cardId));
        });
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

  async function prepareCardsForOffline() {
    if (!paidPlanActive(advisor)) {
      elements.offlineStatus.textContent = 'Kartları cihazda çevrimdışı kullanmak için aktif yıllık lisans gerekir.';
      return;
    }
    if (!('caches' in window)) {
      elements.offlineStatus.textContent = 'Bu tarayıcı çevrimdışı kart saklamayı desteklemiyor.';
      return;
    }

    elements.prepareOffline.disabled = true;
    try {
      const cache = await caches.open(CARD_CACHE_NAME);
      const urls = [];
      Object.values(cardSets).forEach((set) => {
        for (let i = 1; i <= set.total; i += 1) urls.push(`${set.folder}/${i}${set.extension}`);
      });

      for (let index = 0; index < urls.length; index += 10) {
        const batch = urls.slice(index, index + 10);
        await cache.addAll(batch);
        const completed = Math.min(index + batch.length, urls.length);
        elements.offlineStatus.textContent = `Kartlar cihaza indiriliyor: ${completed}/${urls.length}`;
      }
      elements.offlineStatus.textContent = '121 kart cihazda hazır. Cihaz modunu açmak için aşağıdan bir kart seti seçin.';
      showToast('Kartlar cihazda hazırlandı.');
    } catch {
      elements.offlineStatus.textContent = 'Kartlar tamamen indirilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.';
    } finally {
      elements.prepareOffline.disabled = false;
    }
  }

  async function registerPwa() {
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('/service-worker.js'); } catch { /* PWA olmadan da web sürümü çalışır. */ }
    }
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    show(elements.installApp);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hide(elements.installApp);
    showToast('Persona Card cihazınıza kuruldu.');
  });

  elements.installApp.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    hide(elements.installApp);
  });

  elements.prepareOffline.addEventListener('click', prepareCardsForOffline);

  elements.showLogin.addEventListener('click', () => setAuthMode('login'));
  elements.showRegister.addEventListener('click', () => setAuthMode('register'));

  elements.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    elements.authMessage.textContent = 'Giriş yapılıyor...';
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: elements.loginEmail.value, password: elements.loginPassword.value })
      });
      saveAuth(data);
      elements.loginPassword.value = '';
      showAdvisorStart();
      showToast('Giriş yapıldı.');
    } catch (error) {
      elements.authMessage.textContent = error.message;
    }
  });

  elements.registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    elements.authMessage.textContent = 'Hesap oluşturuluyor...';
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          displayName: elements.registerName.value,
          email: elements.registerEmail.value,
          password: elements.registerPassword.value
        })
      });
      saveAuth(data);
      elements.registerPassword.value = '';
      showAdvisorStart();
      showToast('Hesabınız oluşturuldu. 3 ücretsiz kullanım hakkınız hazır.');
    } catch (error) {
      elements.authMessage.textContent = error.message;
    }
  });

  elements.logoutButton.addEventListener('click', () => {
    clearAuth();
    selectedSetKey = null;
    elements.setButtons.forEach((item) => item.classList.remove('selected'));
    setAuthMode('login');
    showAuthPanel();
  });

  elements.setButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedSetKey = button.dataset.set;
      elements.setButtons.forEach((item) => item.classList.toggle('selected', item === button));
      updateLaunchButtons();
    });
  });

  elements.createSession.addEventListener('click', () => {
    if (!selectedSetKey || !socket?.connected || !authToken) return;
    elements.createSession.disabled = true;
    elements.createSession.textContent = 'Oturum oluşturuluyor...';
    socket.emit('createRoom', { cardSet: selectedSetKey, authToken });
  });

  elements.openOffline.addEventListener('click', () => {
    if (!selectedSetKey || !paidPlanActive(advisor)) return;
    role = 'offline';
    roomID = 'LOCAL';
    activeSetKey = selectedSetKey;
    selectedCards = [];
    localOrder = 1;
    renderSession();
  });

  elements.offlineReset.addEventListener('click', () => {
    selectedCards = [];
    localOrder = 1;
    renderSession();
  });
  elements.offlineClose.addEventListener('click', showAdvisorStart);

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

  elements.resetSelection.addEventListener('click', () => socket?.emit('resetRoomCards'));
  elements.closeSession.addEventListener('click', () => socket?.emit('closeRoom'));

  if (socket) {
    socket.on('connect', async () => {
      setConnectionBadge('online');
      if (isInviteVisit) {
        showClientJoining();
        socket.emit('joinRoom', { roomID: inviteRoomID, token: inviteToken });
        return;
      }

      const savedSession = getSavedAdvisorSession();
      await restoreAdvisorAccount();
      if (savedSession?.roomID && savedSession?.token) {
        socket.emit('joinRoom', savedSession);
        return;
      }
      if (advisor) showAdvisorStart();
      else showAuthPanel();
    });

    socket.on('disconnect', async () => {
      setConnectionBadge('offline');
      updateLaunchButtons();
      if (elements.sessionStatus && roomID && role !== 'offline') {
        elements.sessionStatus.textContent = 'Sunucu bağlantısı kesildi. Yeniden bağlanılıyor...';
      }
      if (!isInviteVisit && !role) {
        await restoreAdvisorAccount();
        if (advisor) showAdvisorStart();
      }
    });

    socket.on('roomCreated', (data) => {
      role = 'advisor';
      advisorToken = data.advisorToken;
      clientToken = data.clientToken;
      if (data.advisor) {
        advisor = data.advisor;
        cacheAdvisor(advisor);
      }
      elements.createSession.textContent = 'Çevrimiçi Oturum Oluştur';
      applyRoomState(data);
      saveAdvisorSession();
      elements.inviteLink.value = buildClientInviteLink();
      showToast('Oturum oluşturuldu. Danışan bağlantısını paylaşabilirsiniz.');
    });

    socket.on('joinedRoom', (data) => {
      role = data.role;
      if (role === 'advisor') advisorToken = getSavedAdvisorSession()?.token || null;
      applyRoomState(data);
    });

    socket.on('roomState', (data) => {
      if (roomID && data.roomID !== roomID) return;
      applyRoomState(data);
    });

    socket.on('roomClosed', async () => {
      const wasAdvisor = role === 'advisor';
      if (wasAdvisor) sessionStorage.removeItem(ADVISOR_SESSION_KEY);
      if (role === 'client' || isInviteVisit) sessionStorage.removeItem(CLIENT_INVITE_KEY);
      resetLocalSession();
      if (isInviteVisit || !wasAdvisor) {
        showClientJoining('Bu kart çalışması danışman tarafından kapatıldı.');
        return;
      }
      await restoreAdvisorAccount();
      showAdvisorStart();
      showToast('Oturum kapatıldı.');
    });

    socket.on('sessionError', async ({ code, message } = {}) => {
      const text = message || 'Oturum sırasında bir hata oluştu.';
      showToast(text);
      elements.createSession.textContent = 'Çevrimiçi Oturum Oluştur';

      if (isInviteVisit) {
        if (['ROOM_NOT_FOUND', 'ROOM_EXPIRED', 'INVALID_TOKEN'].includes(code)) {
          sessionStorage.removeItem(CLIENT_INVITE_KEY);
        }
        showClientJoining(text);
        return;
      }

      if (['ROOM_NOT_FOUND', 'INVALID_TOKEN'].includes(code)) {
        sessionStorage.removeItem(ADVISOR_SESSION_KEY);
        await restoreAdvisorAccount();
        return advisor ? showAdvisorStart() : showAuthPanel();
      }

      if (code === 'AUTH_REQUIRED') {
        clearAuth();
        return showAuthPanel();
      }

      if (code === 'LICENSE_REQUIRED') {
        await restoreAdvisorAccount();
        showAdvisorStart();
        elements.licenseMessage.textContent = text;
      }
    });
  }

  registerPwa();
  setAuthMode('login');

  if (isInviteVisit) {
    setConnectionBadge(socket ? 'waiting' : 'offline');
    showClientJoining(socket ? 'Oturum doğrulanıyor...' : 'Bu çalışma için internet bağlantısı gerekiyor.');
  } else if (socket) {
    setConnectionBadge('waiting');
    if (advisor) showAdvisorStart();
  } else {
    setConnectionBadge('offline');
    if (advisor) showAdvisorStart();
    else showAuthPanel();
  }
});
