(() => {
  const legacyBackend = 'https://terapikart.onrender.com';
  const configuredBackend = String(window.PERSONA_CARD_BACKEND_URL || legacyBackend).replace(/\/$/, '');

  if (!configuredBackend || configuredBackend === legacyBackend) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith(legacyBackend)) {
      return nativeFetch(`${configuredBackend}${input.slice(legacyBackend.length)}`, init);
    }
    if (input instanceof Request && input.url.startsWith(legacyBackend)) {
      const redirected = new Request(
        `${configuredBackend}${input.url.slice(legacyBackend.length)}`,
        input
      );
      return nativeFetch(redirected, init);
    }
    return nativeFetch(input, init);
  };

  if (typeof window.io === 'function') {
    const nativeIo = window.io;
    const routedIo = (uri, options) => nativeIo(uri === legacyBackend ? configuredBackend : uri, options);
    Object.assign(routedIo, nativeIo);
    window.io = routedIo;
  }
})();
