(() => {
  function base64urlToBytes(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  function base64ToBytes(value) {
    const binary = atob(String(value || ''));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  function decodePayload(payloadPart) {
    const bytes = base64urlToBytes(payloadPart);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  async function verify(entitlement, publicKeySpki, { advisorId = null, now = Date.now() } = {}) {
    if (!globalThis.crypto?.subtle || !entitlement || !publicKeySpki) return null;
    const parts = String(entitlement).split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

    let payload;
    let key;
    let signature;
    try {
      payload = decodePayload(parts[0]);
      key = await crypto.subtle.importKey(
        'spki',
        base64ToBytes(publicKeySpki),
        { name: 'Ed25519' },
        false,
        ['verify']
      );
      signature = base64urlToBytes(parts[1]);
    } catch {
      return null;
    }

    let valid = false;
    try {
      valid = await crypto.subtle.verify(
        { name: 'Ed25519' },
        key,
        signature,
        new TextEncoder().encode(parts[0])
      );
    } catch {
      return null;
    }
    if (!valid) return null;

    const nowSeconds = Math.floor(now / 1000);
    if (payload.v !== 1 || !payload.sub || !payload.exp || !payload.licenseUntil) return null;
    if (advisorId && payload.sub !== advisorId) return null;
    if (payload.exp <= nowSeconds || payload.licenseUntil <= nowSeconds) return null;
    if (payload.exp > payload.licenseUntil) return null;
    return payload;
  }

  window.PersonaOfflineLicense = { verify };
})();
