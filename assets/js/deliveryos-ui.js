// ============================================================
// DELIVERYOS - LEGADO / UI
// ------------------------------------------------------------
// Este arquivo foi substituído pelos componentes:
// assets/js/components/deliveryos-toast.js
// assets/js/components/deliveryos-loading.js
// Mantido temporariamente como ponte de compatibilidade.
// ============================================================

(function () {
  "use strict";

  if (!window.showToast && window.DeliveryOSToast?.show) {
    window.showToast = window.DeliveryOSToast.show;
  }

  if (!window.setButtonLoading && window.DeliveryOSLoading?.setButton) {
    window.setButtonLoading = window.DeliveryOSLoading.setButton;
  }
})();
