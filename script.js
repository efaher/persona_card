document.addEventListener('DOMContentLoaded', () => {
  const BACKEND_URL = 'https://terapikart.onrender.com';
  const MAX_SELECTED_CARDS = 10;
  const ADVISOR_SESSION_KEY = 'persona-card-advisor-session';
  const AUTH_TOKEN_KEY = 'persona-card-auth-token';

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
    trialCard: document.getElementById('trial-card'),
    trialTitle: document.getElementById('trial-title'),
    trialDescription: document.getElementById('trial-description'),
    trialCount: document.getElementById('trial-count'),
    licenseMessage: document.getElementById('license-message'),
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
    toast: document.getElementById('toast')
  };

  const socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });
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
  let authToken = localStorage.getItem(AUTH_TOKEN_KEY);
  let advisor = null;

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

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const response = await fetch(`${BACKEND_URL}${path}`, { ...options, headers });
    let data = {};
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) {
      const error = new Error(data.message || 'İşlem tamamlanamadı.');
      error.code = data.code;
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

  function saveAuth(data) {
    authToken = data.token;
    advisor = data.advisor;
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
  }

  function clearAuth() {
    authToken = null;
    advisor = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(ADVISOR_SESSION_KEY);
  }

  function paidPlanActive(currentAdvisor) {
    return ['founder', 'lifetime'].includes(currentAdvisor?.plan)
      || (currentAdvisor?.plan === 'annual' && currentAdvisor?.licenseUntil && new Date(currentAdvisor.licenseUntil).getTime() > Date.now());
  }

  function updateAdvisorUi() {
    if (!advisor) return;
    elements.advisorName.textContent = `${advisor.displayName}, kart çalışması başlatın`;
    elements.accountStatus.textContent = advisor.email;
    elements.licenseMessage.textContent = '';

    if (paidPlanActive(advisor)) {
      elements.trialTitle.textContent = advisor.plan === 'founder' ? 'Kurucu Kullanıcı Lisansı' : 'Persona Card Lisansı';
      elements.trialDescription.textContent = advisor.plan === 'annual' && advisor.licenseUntil
        ? `Lisans geçerlilik tarihi: ${new Date(advisor.licenseUntil).toLocaleDateString('tr-TR')}`
        : 'Lisansınız aktif. Kart çalışması kullanım sınırı bulunmuyor.';
      elements.trialCount.textContent = '✓';
      return;
    }

    const remaining = Number(advisor.trialSessionsRemaining || 0);
    elements.trialTitle.textContent = remaining > 0 ? 'Ücretsiz deneme' : 'Ücretsiz kullanım tamamlandı';
    elements.trialDescription.textContent = remaining > 0
      ? 'Her yeni kart çalışması bir kullanım hakkı tüketir.'
      : 'Yeni kart çalışması oluşturmak için Persona Card lisansının etkinleştirilmesi gerekir.';
    elements.trialCount.textContent = String(remaining);
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
    elements.createSession.disabled = !selectedSetKey || !socket.connected || (!paidPlanActive(advisor) && advisor.trialSessionsRemaining <= 0);
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
      advisor = null;
      return false;
    }
    try {
      const data = await api('/api/me');
      advisor = data.advisor;
      return true;
    } catch {
      clearAuth();
      return false;
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
    elements.roleLabel.textContent = role === 'advisor' ? 'Danışman görünümü' : 'Danışan görünümü';
    elements.sessionTitle.textContent = role === 'advisor' ? 'Kart çalışması oturumu' : 'Size yakın gelen kartları seçin';
    elements.roomCode.textContent = roomID;
    elements.activeSetName.textContent = activeSet.name;
    elements.selectedCount.textContent = String(selectedCards.length);

    if (role === 'advisor') {
      show(elements.advisorTools);
      elements.inviteLink.value = buildClientInviteLink();
      elements.workspaceInstruction.textContent = 'Danışanın seçtiği kartlar ekranınızda eş zamanlı görünür. Kartlara sistem tarafından anlam yüklenmez.';
      elements.sessionStatus.textContent = clientConnected ? 'Danışan oturuma bağlı.' : 'Danışanın bağlantıdan katılması bekleniyor.';
    } else {
      hide(elements.advisorTools);
      elements.workspaceInstruction.textContent = `Size yakın gelen kartları seçebilirsiniz. En fazla ${MAX_SELECTED_CARDS} kart seçilebilir; seçimlerinizi tekrar tıklayarak kaldırabilirsiniz.`;
      elements.sessionStatus.textContent = advisorConnected ? 'Danışman oturuma bağlı.' : 'Danışmanın yeniden bağlanması bekleniyor.';
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
          if (isSelected) socket.emit('deselectCard', { cardId: id });
          else if (selectedCards.length >= MAX_SELECTED_CARDS) showToast(`En fazla ${MAX_SELECTED_CARDS} kart seçebilirsiniz.`);
          else socket.emit('selectCard', { cardId: id });
        });
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
      const wrapper = document.createElement(role === 'client' ? 'button' : 'div');
      if (role === 'client') wrapper.type = 'button';
      wrapper.className = 'card selected-card readonly';
      if (role === 'client') {
        wrapper.classList.remove('readonly');
        wrapper.classList.add('client-editable');
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
      const hasCredit = paidPlanActive(advisor) || Number(advisor?.trialSessionsRemaining || 0) > 0;
      elements.createSession.disabled = !selectedSetKey || !socket.connected || !hasCredit;
    });
  });

  elements.createSession.addEventListener('click', () => {
    if (!selectedSetKey || !socket.connected || !authToken) return;
    elements.createSession.disabled = true;
    elements.createSession.textContent = 'Oturum oluşturuluyor...';
    socket.emit('createRoom', { cardSet: selectedSetKey, authToken });
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

  elements.resetSelection.addEventListener('click', () => socket.emit('resetRoomCards'));
  elements.closeSession.addEventListener('click', () => socket.emit('closeRoom'));

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

  socket.on('disconnect', () => {
    setConnectionBadge('offline');
    elements.createSession.disabled = true;
    if (elements.sessionStatus && roomID) elements.sessionStatus.textContent = 'Sunucu bağlantısı kesildi. Yeniden bağlanılıyor...';
  });

  socket.on('roomCreated', (data) => {
    role = 'advisor';
    advisorToken = data.advisorToken;
    clientToken = data.clientToken;
    if (data.advisor) advisor = data.advisor;
    elements.createSession.textContent = 'Oturum Oluştur';
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
    elements.createSession.textContent = 'Oturum Oluştur';

    if (isInviteVisit) {
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

  setConnectionBadge('waiting');
  setAuthMode('login');
  if (isInviteVisit) showClientJoining();
});
