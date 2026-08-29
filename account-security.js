(() => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const verifyEmailToken = String(hashParams.get('verify-email') || '').trim();
  const resetPasswordToken = String(hashParams.get('reset-password') || '').trim();

  let initialAction = null;
  if (verifyEmailToken) initialAction = { type: 'verify-email', token: verifyEmailToken };
  else if (resetPasswordToken) initialAction = { type: 'reset-password', token: resetPasswordToken };

  if (initialAction) {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.hash = '';
    window.history.replaceState(null, document.title, cleanUrl.toString());
  }

  window.PERSONA_ACCOUNT_ACTION = initialAction;

  document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = String(window.PERSONA_CARD_BACKEND_URL || '').replace(/\/$/, '');
    const AUTH_TOKEN_KEY = 'persona-card-auth-token';
    const ADVISOR_CACHE_KEY = 'persona-card-advisor-cache';
    const ADVISOR_SESSION_KEY = 'persona-card-advisor-session';

    const authPanel = document.getElementById('auth-panel');
    const advisorStart = document.getElementById('advisor-start');
    const loginForm = document.getElementById('login-form');
    const loginEmail = document.getElementById('login-email');
    const trialCard = document.getElementById('trial-card');
    const createSession = document.getElementById('create-session');
    const openOffline = document.getElementById('open-offline');
    const prepareOffline = document.getElementById('prepare-offline');

    if (!authPanel || !advisorStart || !loginForm || !BACKEND_URL) return;

    let mailConfigured = false;
    let emailVerificationRequired = false;
    let currentAdvisor = null;
    let actionToken = initialAction?.token || null;

    const actionStyle = document.createElement('style');
    actionStyle.textContent = `
      html[data-persona-account-action="active"] #auth-panel,
      html[data-persona-account-action="active"] #advisor-start,
      html[data-persona-account-action="active"] #client-joining,
      html[data-persona-account-action="active"] #session-panel {
        display: none !important;
      }
      html[data-persona-account-action="active"] #account-action-panel {
        display: block !important;
      }
    `;
    document.head.appendChild(actionStyle);

    const forgotButton = document.createElement('button');
    forgotButton.id = 'forgot-password';
    forgotButton.type = 'button';
    forgotButton.className = 'text-button';
    forgotButton.textContent = 'Şifremi unuttum';
    loginForm.appendChild(forgotButton);

    const actionPanel = document.createElement('section');
    actionPanel.id = 'account-action-panel';
    actionPanel.className = 'panel hidden';
    actionPanel.innerHTML = `
      <p class="section-kicker">Hesap güvenliği</p>
      <h2 id="account-action-title">Hesap işlemi</h2>
      <p id="account-action-description" class="muted"></p>

      <form id="password-reset-request-form" class="auth-form hidden">
        <label>E-posta
          <input id="password-reset-email" type="email" autocomplete="email" required>
        </label>
        <button class="primary-button" type="submit">Sıfırlama Bağlantısı Gönder</button>
      </form>

      <form id="password-reset-confirm-form" class="auth-form hidden">
        <label>Yeni şifre
          <input id="new-password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>
        </label>
        <label>Yeni şifre tekrar
          <input id="new-password-confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>
        </label>
        <p class="form-note">En az 8 karakter.</p>
        <button class="primary-button" type="submit">Şifreyi Güncelle</button>
      </form>

      <p id="account-action-message" class="form-message" aria-live="polite"></p>
      <button id="account-action-back" class="text-button" type="button">Giriş ekranına dön</button>
    `;
    authPanel.insertAdjacentElement('afterend', actionPanel);

    const verificationCard = document.createElement('div');
    verificationCard.id = 'email-verification-card';
    verificationCard.className = 'install-card hidden';
    verificationCard.innerHTML = `
      <div>
        <strong>E-posta doğrulama</strong>
        <p id="email-verification-text" class="muted">Hesabınızın e-posta adresini doğrulayın.</p>
      </div>
      <div class="install-actions">
        <button id="send-verification-email" class="secondary-button" type="button">Doğrulama E-postası Gönder</button>
      </div>
      <p id="email-verification-message" class="form-note" aria-live="polite"></p>
    `;
    if (trialCard) trialCard.insertAdjacentElement('afterend', verificationCard);

    const actionTitle = actionPanel.querySelector('#account-action-title');
    const actionDescription = actionPanel.querySelector('#account-action-description');
    const actionMessage = actionPanel.querySelector('#account-action-message');
    const requestForm = actionPanel.querySelector('#password-reset-request-form');
    const requestEmail = actionPanel.querySelector('#password-reset-email');
    const confirmForm = actionPanel.querySelector('#password-reset-confirm-form');
    const newPassword = actionPanel.querySelector('#new-password');
    const newPasswordConfirm = actionPanel.querySelector('#new-password-confirm');
    const backButton = actionPanel.querySelector('#account-action-back');
    const sendVerification = verificationCard.querySelector('#send-verification-email');
    const verificationText = verificationCard.querySelector('#email-verification-text');
    const verificationMessage = verificationCard.querySelector('#email-verification-message');

    function authToken() {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    }

    async function api(path, { method = 'GET', body, token = authToken() } = {}) {
      const headers = {};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${BACKEND_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      let data = {};
      try { data = await response.json(); } catch { data = {}; }
      if (!response.ok) {
        const error = new Error(data.message || 'İşlem tamamlanamadı.');
        error.code = data.code;
        throw error;
      }
      return data;
    }

    function setActionMode(active) {
      if (active) {
        document.documentElement.dataset.personaAccountAction = 'active';
        actionPanel.classList.remove('hidden');
      } else {
        delete document.documentElement.dataset.personaAccountAction;
        actionPanel.classList.add('hidden');
      }
    }

    function clearAccountAuth() {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(ADVISOR_CACHE_KEY);
      sessionStorage.removeItem(ADVISOR_SESSION_KEY);
    }

    function saveAccountAuth(data) {
      if (data?.token) localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      if (data?.advisor) localStorage.setItem(ADVISOR_CACHE_KEY, JSON.stringify(data.advisor));
    }

    function finishActionAndReload() {
      const url = new URL(window.location.href);
      url.hash = '';
      window.location.replace(url.toString());
    }

    function resetActionMessageState() {
      actionMessage.textContent = '';
      delete actionMessage.dataset.completed;
      backButton.classList.remove('hidden');
    }

    function renderResetRequest() {
      actionToken = null;
      resetActionMessageState();
      requestForm.classList.remove('hidden');
      confirmForm.classList.add('hidden');
      actionTitle.textContent = 'Şifrenizi sıfırlayın';
      actionDescription.textContent = 'Hesabınızın e-posta adresine tek kullanımlık bir şifre sıfırlama bağlantısı göndereceğiz.';
      requestEmail.value = loginEmail?.value || '';
      backButton.textContent = 'Giriş ekranına dön';
      setActionMode(true);
      window.requestAnimationFrame(() => requestEmail.focus());
    }

    function renderResetConfirm() {
      resetActionMessageState();
      requestForm.classList.add('hidden');
      confirmForm.classList.remove('hidden');
      actionTitle.textContent = 'Yeni şifre belirleyin';
      actionDescription.textContent = 'Yeni şifrenizi iki kez girin. Bağlantı tek kullanımlıktır.';
      backButton.textContent = 'Giriş ekranına dön';
      setActionMode(true);
      window.requestAnimationFrame(() => newPassword.focus());
    }

    function renderVerificationConfirm() {
      resetActionMessageState();
      requestForm.classList.add('hidden');
      confirmForm.classList.add('hidden');
      actionTitle.textContent = 'E-posta doğrulanıyor';
      actionDescription.textContent = 'Persona Card hesabınızın e-posta adresi doğrulanıyor.';
      actionMessage.textContent = 'Doğrulanıyor...';
      backButton.classList.add('hidden');
      setActionMode(true);
    }

    function updateVerificationCard() {
      const needsVerification = Boolean(currentAdvisor && !currentAdvisor.emailVerified);
      if (!needsVerification || (!mailConfigured && !emailVerificationRequired)) {
        verificationCard.classList.add('hidden');
        return;
      }

      verificationCard.classList.remove('hidden');
      sendVerification.classList.toggle('hidden', !mailConfigured);
      if (emailVerificationRequired) {
        verificationText.textContent = mailConfigured
          ? 'Çevrimiçi çalışma ve cihaz modu için e-posta adresinizi doğrulayın.'
          : 'E-posta doğrulama zorunlu, ancak e-posta gönderim hizmeti henüz yapılandırılmamış.';
      } else {
        verificationText.textContent = 'Hesabınızın e-posta adresini doğrulayabilirsiniz.';
      }
    }

    function blockUnverifiedFeature(event) {
      if (!emailVerificationRequired || currentAdvisor?.emailVerified) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      verificationCard.classList.remove('hidden');
      verificationMessage.textContent = 'Bu özellik için önce e-posta adresinizi doğrulayın.';
      verificationCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    [createSession, openOffline, prepareOffline].forEach((button) => {
      button?.addEventListener('click', blockUnverifiedFeature, true);
    });

    forgotButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      renderResetRequest();
    });

    backButton.addEventListener('click', () => {
      if (actionMessage.dataset.completed === 'true') return finishActionAndReload();
      actionToken = null;
      setActionMode(false);
      authPanel.classList.remove('hidden');
    });

    requestForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      actionMessage.textContent = 'Bağlantı hazırlanıyor...';
      try {
        const data = await api('/api/auth/password-reset/request', {
          method: 'POST',
          token: null,
          body: { email: requestEmail.value }
        });
        requestForm.classList.add('hidden');
        actionDescription.textContent = data.message || 'E-posta adresinizi kontrol edin.';
        actionMessage.textContent = '';
      } catch (error) {
        actionMessage.textContent = error.message;
      }
    });

    confirmForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!actionToken) {
        actionMessage.textContent = 'Şifre sıfırlama bağlantısı geçersiz.';
        return;
      }
      if (newPassword.value !== newPasswordConfirm.value) {
        actionMessage.textContent = 'Şifreler birbiriyle aynı değil.';
        return;
      }

      actionMessage.textContent = 'Şifre güncelleniyor...';
      try {
        const data = await api('/api/auth/password-reset/confirm', {
          method: 'POST',
          token: null,
          body: { token: actionToken, password: newPassword.value }
        });
        actionToken = null;
        clearAccountAuth();
        confirmForm.classList.add('hidden');
        actionTitle.textContent = 'Şifre güncellendi';
        actionDescription.textContent = data.message || 'Yeni şifrenizle giriş yapabilirsiniz.';
        actionMessage.textContent = '';
        actionMessage.dataset.completed = 'true';
        backButton.textContent = 'Giriş Yap';
      } catch (error) {
        actionMessage.textContent = error.message;
      }
    });

    sendVerification.addEventListener('click', async () => {
      verificationMessage.textContent = 'Doğrulama e-postası gönderiliyor...';
      sendVerification.disabled = true;
      try {
        const data = await api('/api/auth/email-verification/request', { method: 'POST', body: {} });
        verificationMessage.textContent = data.alreadyVerified
          ? 'E-posta adresiniz zaten doğrulanmış.'
          : 'Doğrulama bağlantısı e-posta adresinize gönderildi.';
      } catch (error) {
        verificationMessage.textContent = error.message;
      } finally {
        sendVerification.disabled = false;
      }
    });

    async function confirmVerification() {
      renderVerificationConfirm();
      try {
        const data = await api('/api/auth/email-verification/confirm', {
          method: 'POST',
          token: null,
          body: { token: actionToken }
        });
        actionToken = null;
        saveAccountAuth(data);
        actionTitle.textContent = 'E-posta doğrulandı';
        actionDescription.textContent = 'E-posta adresiniz başarıyla doğrulandı. Persona Card paneline dönebilirsiniz.';
        actionMessage.textContent = '';
        actionMessage.dataset.completed = 'true';
        backButton.classList.remove('hidden');
        backButton.textContent = 'Panele Dön';
      } catch (error) {
        actionToken = null;
        actionTitle.textContent = 'Doğrulama tamamlanamadı';
        actionDescription.textContent = error.message;
        actionMessage.textContent = '';
        backButton.classList.remove('hidden');
      }
    }

    async function refreshCapabilities() {
      try {
        const health = await api('/health', { token: null });
        mailConfigured = Boolean(health.mailConfigured);
        emailVerificationRequired = Boolean(health.emailVerificationRequired);
      } catch {
        mailConfigured = false;
      }

      if (authToken()) {
        try {
          const me = await api('/api/me');
          currentAdvisor = me.advisor || null;
          mailConfigured = Boolean(me.mailConfigured ?? mailConfigured);
          emailVerificationRequired = Boolean(me.emailVerificationRequired ?? emailVerificationRequired);
          updateVerificationCard();
        } catch {
          currentAdvisor = null;
          verificationCard.classList.add('hidden');
        }
      } else {
        currentAdvisor = null;
        verificationCard.classList.add('hidden');
      }
    }

    const advisorObserver = new MutationObserver(() => {
      if (!advisorStart.classList.contains('hidden')) refreshCapabilities();
    });
    advisorObserver.observe(advisorStart, { attributes: true, attributeFilter: ['class'] });

    if (initialAction?.type === 'reset-password') {
      renderResetConfirm();
    } else if (initialAction?.type === 'verify-email') {
      confirmVerification();
    }

    refreshCapabilities();
  });
})();