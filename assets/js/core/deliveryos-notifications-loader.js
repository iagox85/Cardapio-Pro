// ============================================================
// DELIVERYOS - LEGADO / LOADER DE NOTIFICAÇÕES
// ------------------------------------------------------------
// Desativado na Etapa 1 da limpeza.
// O core principal deliveryos.js será responsável por iniciar os
// módulos globais nas próximas etapas.
// ============================================================

(function () {
  "use strict";

  const Loader = {
    __legacyDisabled: true,
    start() {}
  };

  window.DeliveryOSNotificationsLoader = Loader;
  window.DeliveryOS?.registrarModulo?.("notificationsLoaderLegacy", Loader);
})();
