document.addEventListener('DOMContentLoaded', () => {
  const AUTH_TOKEN_KEY = 'persona-card-auth-token';
  const ADVISOR_CACHE_KEY = 'persona-card-advisor-cache';
  const OFFLINE_ENTITLEMENT_KEY = 'persona-card-offline-entitlement-v1';
  const LICENSE_CACHE_NAME = 'persona-card-license-v1';
  const PUBLIC_KEY_CACHE_URL = '/__persona_card_offline_public_key__';
  const BACKEND_URL = String(window.PERSONA_CARD_BACKEND_URL || '').replace(/\/$/, '');

  const openOffline = document.getElementById('open-offline');
  const prepareOffline = document.getElementById('prepare-offline');
  const offlineStatus = document.getElementById('offline-status');
  const logoutButton = document.getElementById('logout-button');
  const setButtons = Array.from(document.querySelectorAll('.set-card'));

  let validEntitlement = null;
  let refreshPromise = null;

  function readAdvisor() {
    try {
      return JSON.parse(localStorage.getItem(ADVISOR_CACHE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function selectedSetExists() {
    return setButtons.some((button) => button.classList.contains('selected'));
  }

  async function readPinnedPublicKey() {
    if (!('caches' in window)) return null;
    const cache = await caches.open(LICENSE_CACHE_NAME);
    const response = await cache.match(PUBLIC_KEY_CACHE_URL);
    return response ? response.text() : null;
  }

  async function pinPublicKey(publicKeySpki) {
    if (!('caches' in window) || !publicKeySpki) return;
    const cache = await caches.open(LICENSE_CACHE_NAME);
    await cache.put(
      PUBLIC_KEY_CACHE_URL,
      new Response(String(publicKeySpki), { headers: { 'Content-Type': 'text/plain' } })
    );
  }

  async function verifyCachedEntitlement() {
    validEntitlement = null;
    const advisor = readAdvisor();
    const entitlement = localStorage.getItem(OFFLINE_ENTITLEMENT_KEY);
    const publicKeySpki = await readPinnedPublicKey();
    if (!advisor?.id || !entitlement || !publicKeySpki || !window.PersonaOfflineLicense?.verify) return false;

    const payload = await window.PersonaOfflineLicense.verify(entitlement, publicKeySpki, {
      advisorId: advisor.id
    });
    if (!payload) return false;
    validEntitlement = payload;
    return true;
  }

  function setGuardDisabled(element, disabled) {
    if (!element) return;
    if (disabled) {
      element.dataset.offlineGuardDisabled = 'true';
      element.disabled = true;
      return;
    }
    if (element.dataset.offlineGuardDisabled === 'true') {
      delete element.dataset.offlineGuardDisabled;
      element.disabled = false;
    }
  }

  function renderGuardState() {
    const valid = Boolean(validEntitlement);
    setGuardDisabled(openOffline, !valid || !selectedSetExists());
    setGuardDisabled(prepareOffline, !valid);

    if (!offlineStatus) return;
    if (valid) {
      const until = new Date(validEntitlement.exp * 1000).toLocaleDateString('tr-TR');
      if (!offlineStatus.textContent.includes('121 kart')) {
        offlineStatus.textContent = `İmzalı çevrimdışı cihaz yetkisi ${until} tarihine kadar geçerli.`;
      }
    } else if (readAdvisor()?.plan === 'annual') {
      offlineStatus.textContent = navigator.onLine
        ? 'Çevrimdışı cihaz yetkisi doğrulanıyor...'
        : 'Çevrimdışı cihaz yetkisi doğrulanamadı. İnternete bağlanıp lisansınızı yenileyin.';
    }
  }

  async function fetchFreshEntitlement() {
    const advisor = readAdvisor();
    const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!advisor?.id || advisor.plan !== 'annual' || !authToken || !BACKEND_URL || !navigator.onLine) return false;

    const response = await fetch(`${BACKEND_URL}/api/offline-entitlement`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!response.ok) {
      if ([401, 403].includes(response.status)) localStorage.removeItem(OFFLINE_ENTITLEMENT_KEY);
      return false;
    }

    const data = await response.json();
    if (!data.entitlement || !data.publicKeySpki) return false;
    await pinPublicKey(data.publicKeySpki);
    localStorage.setItem(OFFLINE_ENTITLEMENT_KEY, data.entitlement);
    return verifyCachedEntitlement();
  }

  async function refresh({ network = true } = {}) {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      let valid = await verifyCachedEntitlement();
      if (network && navigator.onLine) {
        try {
          valid = await fetchFreshEntitlement() || valid;
        } catch {
          // Ağ hatasında geçerli cache'li entitlement varsa çevrimdışı kullanım devam eder.
        }
      }
      renderGuardState();
      return valid;
    })();

    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  }

  async function requireSignedEntitlement(event) {
    const valid = await refresh({ network: navigator.onLine });
    if (valid) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (offlineStatus) {
      offlineStatus.textContent = 'Cihaz modu için geçerli imzalı çevrimdışı lisans yetkisi gerekir.';
    }
  }

  // Capture listener mevcut script.js click handlerından önce çalışır.
  openOffline?.addEventListener('click', requireSignedEntitlement, true);
  prepareOffline?.addEventListener('click', requireSignedEntitlement, true);

  setButtons.forEach((button) => {
    button.addEventListener('click', () => setTimeout(renderGuardState, 0));
  });

  logoutButton?.addEventListener('click', async () => {
    validEntitlement = null;
    localStorage.removeItem(OFFLINE_ENTITLEMENT_KEY);
    if ('caches' in window) await caches.delete(LICENSE_CACHE_NAME);
    renderGuardState();
  });

  window.addEventListener('online', () => refresh({ network: true }));
  window.addEventListener('focus', () => refresh({ network: navigator.onLine }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh({ network: navigator.onLine });
  });

  // script.js bazı durumlarda disabled durumunu yeniden hesapladığı için yalnız ilgili
  // element değişikliklerini gözleyip imzalı lisans kuralını tekrar uygularız.
  const observer = new MutationObserver(() => queueMicrotask(renderGuardState));
  if (openOffline) observer.observe(openOffline, { attributes: true, attributeFilter: ['disabled'] });
  setButtons.forEach((button) => observer.observe(button, { attributes: true, attributeFilter: ['class'] }));

  refresh({ network: navigator.onLine });
});
