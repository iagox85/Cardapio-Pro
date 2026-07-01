// ============================================================
// DELIVERYOS - STORAGE
// ------------------------------------------------------------
// Utilitário seguro para localStorage/sessionStorage.
// Evita quebrar páginas caso o navegador bloqueie storage.
// ============================================================

(function () {
  "use strict";

  if (window.DeliveryOSStorage) return;

  function safe(fn, fallback = null) {
    try {
      return fn();
    } catch (_) {
      return fallback;
    }
  }

  const Storage = {
    get(key, fallback = null) {
      const value = safe(() => localStorage.getItem(key), null);
      return value === null || value === undefined ? fallback : value;
    },

    set(key, value) {
      return safe(() => {
        localStorage.setItem(key, String(value));
        return true;
      }, false);
    },

    remove(key) {
      return safe(() => {
        localStorage.removeItem(key);
        return true;
      }, false);
    },

    getJSON(key, fallback = null) {
      return safe(() => {
        const value = localStorage.getItem(key);
        if (!value) return fallback;
        return JSON.parse(value);
      }, fallback);
    },

    setJSON(key, value) {
      return safe(() => {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      }, false);
    },

    session: {
      get(key, fallback = null) {
        const value = safe(() => sessionStorage.getItem(key), null);
        return value === null || value === undefined ? fallback : value;
      },

      set(key, value) {
        return safe(() => {
          sessionStorage.setItem(key, String(value));
          return true;
        }, false);
      },

      remove(key) {
        return safe(() => {
          sessionStorage.removeItem(key);
          return true;
        }, false);
      }
    }
  };

  window.DeliveryOSStorage = Storage;
  window.DeliveryOS?.registrarModulo?.("storage", Storage);
})();
